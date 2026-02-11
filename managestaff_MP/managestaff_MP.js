import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, getDoc } 
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
        const COLLECTION_NAME = "staff";

        async function loadData() {
            const tableBody = document.getElementById('tableBody');
            const emptyState = document.getElementById('emptyState');
            const emptyMsg = document.getElementById('emptyMsg');
            const countBadge = document.getElementById('countBadge');

            tableBody.innerHTML = '';
            
            try {
                const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
                let list = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.role === 'Instructor' && 
                        data.major && data.major.includes('MP')) {
                        list.push(data);
                    }
                });

                list.sort((a, b) => a.name.localeCompare(b.name));
                countBadge.innerText = `${list.length} ท่าน`;

                if (list.length > 0) {
                    emptyState.style.display = 'none';
                    list.forEach(item => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><strong>${item.name} ${item.surname}</strong></td>
                            <td>${item.email}</td>
                            <td style="color:#888;">${item.password}</td>
                            <td><span class="badge-role">MP</span></td>
                            <td>
                                <button class="btn-del" onclick="window.deleteItem('${item.email}', '${item.name}')">
                                    ลบ
                                </button>
                            </td>
                        `;
                        tableBody.appendChild(tr);
                    });
                } else {
                    emptyState.style.display = 'block';
                    emptyMsg.innerText = "ยังไม่มีข้อมูลอาจารย์";
                    emptyMsg.previousElementSibling.className = "fas fa-folder-open";
                }

            } catch (error) {
                console.error("Load Error:", error);
                emptyState.style.display = 'block';
                if(error.message.includes("permissions")) {
                    emptyMsg.innerHTML = "<span style='color:red'>เข้าถึงข้อมูลไม่ได้ (Permission Denied)<br>กรุณาแก้ Firebase Rules ตามคำแนะนำด้านบน</span>";
                    emptyMsg.previousElementSibling.className = "fas fa-lock";
                    emptyMsg.previousElementSibling.style.color = "red";
                } else {
                    emptyMsg.innerText = "เกิดข้อผิดพลาด: " + error.message;
                }
            }
        }

        document.getElementById('staffForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSave');
            const oldText = btn.innerHTML;
            
            const name = document.getElementById('insName').value.trim();
            const surname = document.getElementById('insSurname').value.trim();
            const email = document.getElementById('insEmail').value.trim();
            const pass = document.getElementById('insPass').value.trim();

            if(!name || !surname || !email || !pass) return;

            btn.disabled = true;
            btn.innerHTML = 'กำลังบันทึก...';

            try {
                const docRef = doc(db, COLLECTION_NAME, email);
                
                const payload = {
                    email: email,
                    password: pass,
                    name: name,
                    surname: surname,
                    curriculum: ['MSc'],
                    major: ['MP'],
                    role: 'Instructor'
                };

                await setDoc(docRef, payload);
                
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ',
                    timer: 1500,
                    showConfirmButton: false
                });
                document.getElementById('staffForm').reset();
                loadData();

            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: error.message });
            } finally {
                btn.disabled = false;
                btn.innerHTML = oldText;
            }
        });

        window.deleteItem = async function(email, name) {
            const result = await Swal.fire({
                title: `ลบ ${name}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'ลบ',
                cancelButtonText: 'ยกเลิก'
            });

            if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(db, COLLECTION_NAME, email));
                    loadData();
                    Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1000, showConfirmButton: false });
                } catch (e) {
                    Swal.fire('Error', e.message, 'error');
                }
            }
        }
        loadData();