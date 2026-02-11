        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, collection, setDoc, doc, getDocs, serverTimestamp, query, where } 
        from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyD5X264Dqy9QuLqcUagBFD-Y6LdxTnQaJ8",
            authDomain: "mp-entrance.firebaseapp.com",
            projectId: "mp-entrance",
            storageBucket: "mp-entrance.firebasestorage.app",
            messagingSenderId: "136386612299",
            appId: "1:136386612299:web:6cdfc55c94c00cca8d11ce",
            measurementId: "G-Z04M66B743"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const STUDENT_COLLECTION = "student";
        const SCORE_COLLECTION = "group_assessment_scores"; 

        let allStudents = [];
        let currentInstructorEmail = "";
        let currentInstructorName = "";

        function init() {
            currentInstructorEmail = localStorage.getItem('staffEmail');
            currentInstructorName = localStorage.getItem('staffName');

            if (!currentInstructorEmail) {
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
                    confirmButtonText: 'กลับหน้า Login'
                }).then(() => {
                    window.location.href = '../index.html';
                });
                return;
            }

            document.getElementById('instructorNameDisplay').innerText = currentInstructorName || currentInstructorEmail;
            setupEventListeners();
            loadData();
        }

        async function loadData() {
            try {
                document.getElementById('studentTableBody').innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</td></tr>';
                
                const stdSnapshot = await getDocs(collection(db, STUDENT_COLLECTION));
                const q = query(collection(db, SCORE_COLLECTION), where("instructorEmail", "==", currentInstructorEmail));
                const scoreSnapshot = await getDocs(q);

                const myScores = {};
                scoreSnapshot.forEach(doc => {
                    const data = doc.data();
                    myScores[data.studentId] = data; 
                });

                allStudents = [];
                stdSnapshot.forEach(doc => {
                    const data = doc.data();
                    allStudents.push({
                        id: doc.id, 
                        order: data.order,
                        name: data.name,
                        university: data.university,
                        major: data.major,
                        scores: myScores[doc.id] ? myScores[doc.id].scores : { q1: '', q2: '', q3: '', q4: '', q5: '' },
                        hasScore: !!myScores[doc.id]
                    });
                });

                allStudents.sort((a, b) => parseInt(a.order) - parseInt(b.order));
                renderTable();

            } catch (error) {
                console.error("Error loading data:", error);
                Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
            }
        }

        function renderTable() {
            const tbody = document.getElementById('studentTableBody');
            tbody.innerHTML = '';

            allStudents.forEach((std) => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-id', std.id);
                tr.setAttribute('data-name', std.name);

                const s = std.scores;
                const total = (Number(s.q1)||0) + (Number(s.q2)||0) + (Number(s.q3)||0) + (Number(s.q4)||0) + (Number(s.q5)||0);
                const isLocked = std.hasScore;
                if(isLocked) tr.classList.add('row-saved');

                tr.innerHTML = `
                    <td class="col-order">${std.order}</td>
                    <td class="col-info">
                        <span class="student-name">${std.name}</span>
                        <div class="student-meta">
                            <div class="meta-row"><i class="fas fa-university"></i> ${std.university}</div>
                            <div class="meta-row"><i class="fas fa-book"></i> ${std.major}</div>
                        </div>
                    </td>
                    
                    <td class="col-score"><input type="number" class="score-input inp-q1" inputmode="decimal" value="${s.q1}" ${isLocked ? 'disabled' : ''}></td>
                    <td class="col-score"><input type="number" class="score-input inp-q2" inputmode="decimal" value="${s.q2}" ${isLocked ? 'disabled' : ''}></td>
                    <td class="col-score"><input type="number" class="score-input inp-q3" inputmode="decimal" value="${s.q3}" ${isLocked ? 'disabled' : ''}></td>
                    <td class="col-score"><input type="number" class="score-input inp-q4" inputmode="decimal" value="${s.q4}" ${isLocked ? 'disabled' : ''}></td>
                    <td class="col-score"><input type="number" class="score-input inp-q5" inputmode="decimal" value="${s.q5}" ${isLocked ? 'disabled' : ''}></td>
                    
                    <td class="col-total">
                        <span class="row-total">${total > 0 ? (Number.isInteger(total) ? total : total.toFixed(1)) : '-'}</span>
                    </td>

                    <td class="col-action">
                        <button type="button" class="btn-icon btn-row-save" style="display: ${isLocked ? 'none' : 'inline-flex'};">
                            <i class="fas fa-save"></i> Save
                        </button>
                        <button type="button" class="btn-icon btn-row-edit" style="display: ${isLocked ? 'inline-flex' : 'none'};">
                            <i class="fas fa-pen"></i> Edit
                        </button>
                    </td>
                `;

                tbody.appendChild(tr);
            });
        }
        
        function setupEventListeners() {
            const tbody = document.getElementById('studentTableBody');

            tbody.addEventListener('click', (e) => {
                const saveBtn = e.target.closest('.btn-row-save');
                if (saveBtn) {
                    handleSaveRow(saveBtn);
                    return;
                }
                const editBtn = e.target.closest('.btn-row-edit');
                if (editBtn) {
                    handleEditRow(editBtn);
                    return;
                }
            });

            tbody.addEventListener('input', (e) => {
                if (e.target.classList.contains('score-input')) {
                    calculateRow(e.target);
                }
            });
        }

        function calculateRow(input) {
            let val = parseFloat(input.value);
            if(val > 5) { input.value = 5; val = 5; }
            if(val < 0) { input.value = 0; val = 0; }

            updateTotal(input.closest('tr'));
        }

        function updateTotal(row) {
            const q1 = parseFloat(row.querySelector('.inp-q1').value) || 0;
            const q2 = parseFloat(row.querySelector('.inp-q2').value) || 0;
            const q3 = parseFloat(row.querySelector('.inp-q3').value) || 0;
            const q4 = parseFloat(row.querySelector('.inp-q4').value) || 0;
            const q5 = parseFloat(row.querySelector('.inp-q5').value) || 0;

            const total = q1 + q2 + q3 + q4 + q5;
            const totalSpan = row.querySelector('.row-total');
            totalSpan.innerText = total > 0 ? (Number.isInteger(total) ? total : total.toFixed(1)) : '-';
            totalSpan.style.color = total >= 20 ? '#2e7d32' : (total >= 12.5 ? '#D4812C' : '#c62828');
        }

        async function handleSaveRow(btn) {
            if(btn.disabled) return;
            
            const row = btn.closest('tr');
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
            btn.disabled = true;

            const name = row.getAttribute('data-name');
            const studentId = row.getAttribute('data-id');
            const uni = row.querySelector('.student-meta .meta-row:nth-child(1)').innerText.trim();
            const order = row.querySelector('.col-order').innerText;

            const q1 = parseFloat(row.querySelector('.inp-q1').value) || 0;
            const q2 = parseFloat(row.querySelector('.inp-q2').value) || 0;
            const q3 = parseFloat(row.querySelector('.inp-q3').value) || 0;
            const q4 = parseFloat(row.querySelector('.inp-q4').value) || 0;
            const q5 = parseFloat(row.querySelector('.inp-q5').value) || 0;
            const total = q1 + q2 + q3 + q4 + q5;

            try {
                const docId = `${studentId}_${currentInstructorEmail}`;
                const docRef = doc(db, SCORE_COLLECTION, docId);
                
                await setDoc(docRef, {
                    scoreId: docId,
                    studentId: studentId,
                    studentName: name,
                    order: order,
                    university: uni,
                    instructorEmail: currentInstructorEmail,
                    instructorName: currentInstructorName,
                    scores: { q1, q2, q3, q4, q5 },
                    total: total,
                    timestamp: serverTimestamp()
                }, { merge: true });

                row.querySelectorAll('.score-input').forEach(inp => inp.disabled = true);
                row.classList.add('row-saved');
                
                btn.style.display = 'none';
                row.querySelector('.btn-row-edit').style.display = 'inline-flex';

                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
                    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
                });
                Toast.fire({ icon: 'success', title: 'Saved' });

            } catch (error) {
                console.error("Save Error:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: error.message });
            } finally {
                btn.innerHTML = '<i class="fas fa-save"></i> Save';
                btn.disabled = false;
            }
        }

        function handleEditRow(btn) {
            const row = btn.closest('tr');
            
            Swal.fire({
                title: 'แก้ไขคะแนน?', 
                icon: 'question', 
                showCancelButton: true,
                confirmButtonColor: '#d33', 
                confirmButtonText: 'แก้ไข', 
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    row.querySelectorAll('.score-input').forEach(inp => inp.disabled = false);
                    row.classList.remove('row-saved');
                    
                    btn.style.display = 'none';
                    const saveBtn = row.querySelector('.btn-row-save');
                    saveBtn.style.display = 'inline-flex';
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                }
            });
        }

        init();