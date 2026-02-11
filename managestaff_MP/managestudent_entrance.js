import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } 
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
        const COLLECTION_NAME = "student";
        
        let currentStudentList = [];

        async function loadData() {
            const emptyState = document.getElementById('emptyState');
            const emptyMsg = document.getElementById('emptyMsg');
            const statusIcon = document.getElementById('statusIcon');
            
            emptyState.style.display = 'block';
            statusIcon.className = 'fas fa-spinner fa-spin';
            statusIcon.style.color = '#ccc';
            emptyMsg.innerText = 'กำลังโหลดข้อมูล...';
            
            try {
                const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
                currentStudentList = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    data.id = doc.id; 
                    currentStudentList.push(data);
                });

                renderTable();

            } catch (error) {
                console.error("Load Error:", error);
                emptyState.style.display = 'block';
                statusIcon.className = 'fas fa-exclamation-circle';
                statusIcon.style.color = '#dc3545';
                emptyMsg.innerHTML = `เกิดข้อผิดพลาด: <br><span style="font-size:0.8rem">${error.message}</span>`;
            }
        }

        function renderTable() {
            const tableBody = document.getElementById('tableBody');
            const countBadge = document.getElementById('countBadge');
            const emptyState = document.getElementById('emptyState');
            const statusIcon = document.getElementById('statusIcon');
            const emptyMsg = document.getElementById('emptyMsg');

            tableBody.innerHTML = '';
            
            currentStudentList.sort((a, b) => {
                return (a.order || 0) - (b.order || 0);
            });

            countBadge.innerText = `${currentStudentList.length} ท่าน`;

            if (currentStudentList.length > 0) {
                emptyState.style.display = 'none';
                currentStudentList.forEach((item) => {
                    const tr = document.createElement('tr');
                    const orderShow = item.order ? item.order : '-';

                    tr.innerHTML = `
                        <td style="text-align: center;"><strong>${orderShow}</strong></td>
                        <td>${item.name}</td>
                        <td>${item.university}</td>
                        <td>${item.major}</td>
                        <td>
                            <button class="btn-del" onclick="window.deleteItem('${item.id}', '${item.name}')">
                                ลบ
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            } else {
                emptyState.style.display = 'block';
                statusIcon.className = 'fas fa-folder-open';
                statusIcon.style.color = '#ccc';
                emptyMsg.innerText = "ยังไม่มีรายชื่อผู้สอบ";
            }
        }

        document.getElementById('studentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSave');
            const oldText = btn.innerHTML;
            
            const name = document.getElementById('stdName').value.trim();
            const uni = document.getElementById('stdUni').value.trim();
            const major = document.getElementById('stdMajor').value.trim();

            if(!name || !uni || !major) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';

            try {
                let maxOrder = 0;
                currentStudentList.forEach(item => {
                    if (item.order && typeof item.order === 'number' && item.order > maxOrder) {
                        maxOrder = item.order;
                    }
                });
                
                const newOrder = maxOrder + 1;
                const docRef = doc(db, COLLECTION_NAME, name);
                
                const payload = {
                    id: name,
                    order: newOrder,
                    name: name,
                    university: uni,
                    major: major,
                    createdAt: new Date().toISOString()
                };

                await setDoc(docRef, payload);
                
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    text: `ลำดับที่: ${newOrder}`,
                    timer: 1500,
                    showConfirmButton: false
                });
                
                document.getElementById('studentForm').reset();
                
                currentStudentList.push(payload);
                renderTable();

            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: error.message });
            } finally {
                btn.disabled = false;
                btn.innerHTML = oldText;
            }
        });

        window.deleteItem = async function(docId, name) {
            const result = await Swal.fire({
                title: `ลบ ${name}?`,
                text: 'หากลบ ลำดับของคนอื่นจะไม่เปลี่ยน',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'ลบ',
                cancelButtonText: 'ยกเลิก'
            });

            if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(db, COLLECTION_NAME, docId));
                    Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย', timer: 1000, showConfirmButton: false });
                    
                    currentStudentList = currentStudentList.filter(s => s.id !== docId);
                    renderTable();
                    
                } catch (e) {
                    Swal.fire('Error', e.message, 'error');
                }
            }
        }

        loadData();