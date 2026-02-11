        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        localStorage.clear();

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

        window.toggleForms = function() {
            const loginForm = document.getElementById('loginForm');
            const changePassForm = document.getElementById('changePasswordForm');
            const title = document.getElementById('pageTitle');
            
            if (loginForm.classList.contains('hidden')) {
                loginForm.classList.remove('hidden');
                changePassForm.classList.add('hidden');
                title.innerText = 'Medical Physics Staff';
                document.getElementById('formChangePass').reset();
            } else {
                loginForm.classList.add('hidden');
                changePassForm.classList.remove('hidden');
                title.innerText = 'จัดการบัญชีผู้ใช้';
                document.getElementById('formStudentLogin').reset();
            }
        };

        const loginForm = document.getElementById('formStudentLogin');
        const btnLogin = document.getElementById('btnLogin');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalText = btnLogin.innerHTML;
            btnLogin.innerHTML = 'กำลังตรวจสอบ...';
            btnLogin.disabled = true;

            const email = document.getElementById('student_email').value.trim();
            const password = document.getElementById('student_password').value;

            try {
                const docRef = doc(db, "staff", email);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().password === password) {
                    const data = docSnap.data();

                    if (data.role === 'HR') {
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่มีสิทธิ์เข้าถึง',
                            text: 'ระบบนี้สำหรับอาจารย์และเจ้าหน้าที่เท่านั้น',
                            confirmButtonColor: '#F27C21'
                        });
                        btnLogin.innerHTML = originalText;
                        btnLogin.disabled = false;
                        return; 
                    }

                    try {
                        await setDoc(doc(db, "login_history", email), {
                            email: email,
                            role: data.role,
                            login_time: serverTimestamp()
                        });
                    } catch (err) { console.warn("Log error", err); }

                    localStorage.setItem("staffEmail", data.email);
                    localStorage.setItem("staffName", `${data.name} ${data.surname}`);

                    Swal.fire({
                        icon: 'success',
                        title: 'เข้าสู่ระบบสำเร็จ',
                        text: `ยินดีต้อนรับคุณ ${data.name}`,
                        timer: 1500,
                        showConfirmButton: false,
                        confirmButtonColor: '#1C3879'
                    }).then(() => {
                        window.location.replace("./staffMP_login/index_MPentrance.html"); 
                    });

                } else {
                    Swal.fire({ 
                        icon: 'error', 
                        title: 'เข้าสู่ระบบไม่สำเร็จ', 
                        text: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่มีในระบบ', 
                        confirmButtonColor: '#F27C21' 
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ' });
            } finally {
                btnLogin.innerHTML = originalText;
                btnLogin.disabled = false;
            }
        });

        const changePassForm = document.getElementById('formChangePass');
        const btnChangePass = document.getElementById('btnChangePass');

        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('change_email').value.trim();
            const oldPass = document.getElementById('old_password').value;
            const newPass = document.getElementById('new_password').value;
            const confirmPass = document.getElementById('confirm_password').value;

            if (newPass !== confirmPass) {
                Swal.fire({ icon: 'warning', title: 'รหัสผ่านไม่ตรงกัน', text: 'กรุณากรอกรหัสผ่านใหม่ให้ตรงกัน', confirmButtonColor: '#F27C21' });
                return;
            }
            if (newPass.length < 6) {
                Swal.fire({ icon: 'warning', title: 'รหัสผ่านสั้นเกินไป', text: 'ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', confirmButtonColor: '#F27C21' });
                return;
            }

            const originalText = btnChangePass.innerHTML;
            btnChangePass.innerHTML = 'กำลังบันทึก...';
            btnChangePass.disabled = true;

            try {
                const docRef = doc(db, "staff", email);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const currentData = docSnap.data();
                    
                    if (currentData.password === oldPass) {
                        await updateDoc(docRef, { password: newPass });
                        
                        Swal.fire({
                            icon: 'success',
                            title: 'เปลี่ยนรหัสผ่านสำเร็จ!',
                            text: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่',
                            confirmButtonColor: '#1C3879'
                        }).then(() => {
                            window.toggleForms();
                            document.getElementById('student_email').value = email;
                            document.getElementById('student_password').value = "";
                        });
                    } else {
                        Swal.fire({ icon: 'error', title: 'รหัสผ่านเดิมไม่ถูกต้อง', text: 'กรุณาตรวจสอบรหัสผ่านเดิมอีกครั้ง', confirmButtonColor: '#F27C21' });
                    }
                } else {
                    Swal.fire({ icon: 'error', title: 'ไม่พบผู้ใช้งาน', text: 'ไม่พบอีเมลนี้ในระบบ', confirmButtonColor: '#F27C21' });
                }
            } catch (error) {
                console.error("Change Pass Error:", error);
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
            } finally {
                btnChangePass.innerHTML = originalText;
                btnChangePass.disabled = false;
            }
        });