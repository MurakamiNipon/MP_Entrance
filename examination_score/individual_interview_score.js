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
        const INDIVIDUAL_SCORE_COLLECTION = "individual_assessment_scores";

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
                document.getElementById('studentTableBody').innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;"><i class="fas fa-circle-notch fa-spin"></i> Loading...</td></tr>';
                
                const stdSnapshot = await getDocs(collection(db, STUDENT_COLLECTION));
                const q = query(collection(db, INDIVIDUAL_SCORE_COLLECTION), where("instructorEmail", "==", currentInstructorEmail));
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
                        decision: myScores[doc.id] ? myScores[doc.id].decision : null,
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
                
                const isLocked = std.hasScore;
                if(isLocked) tr.classList.add('row-saved');

                const decision = std.decision;

                tr.innerHTML = `
                    <td class="col-order">${std.order}</td>
                    <td class="col-info">
                        <span class="student-name">${std.name}</span>
                        <div class="student-meta">
                            <div class="meta-row"><i class="fas fa-university"></i> ${std.university}</div>
                            <div class="meta-row"><i class="fas fa-book"></i> ${std.major}</div>
                        </div>
                    </td>
                    
                    <td class="col-decision">
                        <div class="choice-group">
                            <button type="button" class="choice-btn btn-pass ${decision === 'pass' ? 'active' : ''}" 
                                data-value="pass" ${isLocked ? 'disabled' : ''}>
                                <i class="fas fa-check-circle"></i> รับ
                            </button>
                            <button type="button" class="choice-btn btn-unsure ${decision === 'unsure' ? 'active' : ''}" 
                                data-value="unsure" ${isLocked ? 'disabled' : ''}>
                                <i class="fas fa-question-circle"></i> ไม่แน่ใจ
                            </button>
                            <button type="button" class="choice-btn btn-fail ${decision === 'fail' ? 'active' : ''}" 
                                data-value="fail" ${isLocked ? 'disabled' : ''}>
                                <i class="fas fa-times-circle"></i> ไม่รับ
                            </button>
                        </div>
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
                const choiceBtn = e.target.closest('.choice-btn');
                if (choiceBtn) {
                    if (choiceBtn.disabled) return;
                    handleChoiceSelection(choiceBtn);
                    return;
                }

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
        }

        function handleChoiceSelection(btn) {
            const group = btn.parentElement;
            group.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        async function handleSaveRow(btn) {
            if(btn.disabled) return;
        
            const row = btn.closest('tr');
            
            const activeBtn = row.querySelector('.choice-btn.active');
            
            if (!activeBtn) {
                Swal.fire({
                    icon: 'warning',
                    title: 'กรุณาเลือกผลการพิจารณา',
                    text: 'ต้องระบุ รับ / ไม่แน่ใจ / ไม่รับ ก่อนบันทึก',
                    timer: 2000
                });
                return;
            }

            const decisionValue = activeBtn.getAttribute('data-value');
            
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
            btn.disabled = true;

            const name = row.getAttribute('data-name');
            const studentId = row.getAttribute('data-id');
            const uni = row.querySelector('.student-meta .meta-row:nth-child(1)').innerText.trim();
            const order = row.querySelector('.col-order').innerText;

            try {

                const docId = `${studentId}_${currentInstructorEmail}`;
                const docRef = doc(db, INDIVIDUAL_SCORE_COLLECTION, docId);
                
                await setDoc(docRef, {
                    scoreId: docId,
                    studentId: studentId,
                    studentName: name,
                    order: order,
                    university: uni,
                    instructorEmail: currentInstructorEmail,
                    instructorName: currentInstructorName,
                    
                    decision: decisionValue,
                    
                    timestamp: serverTimestamp()
                }, { merge: true });

                row.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
                row.classList.add('row-saved');
                
                btn.style.display = 'none';
                row.querySelector('.btn-row-edit').style.display = 'inline-flex';

                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
                    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
                });
                Toast.fire({ icon: 'success', title: 'บันทึกเรียบร้อย' });

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
                title: 'แก้ไขผลพิจารณา?', 
                icon: 'question', 
                showCancelButton: true,
                confirmButtonColor: '#d33', 
                confirmButtonText: 'แก้ไข', 
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    row.querySelectorAll('.choice-btn').forEach(b => b.disabled = false);
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