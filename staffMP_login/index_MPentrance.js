const firebaseConfig = {
            apiKey: "AIzaSyD5X264Dqy9QuLqcUagBFD-Y6LdxTnQaJ8",
            authDomain: "mp-entrance.firebaseapp.com",
            projectId: "mp-entrance",
            storageBucket: "mp-entrance.firebasestorage.app",
            messagingSenderId: "136386612299",
            appId: "1:136386612299:web:6cdfc55c94c00cca8d11ce",
            measurementId: "G-Z04M66B743"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
        
        window.toggleSidebar = toggleSidebar;

        function checkAuth() {
            let userEmail = localStorage.getItem('staffEmail');
            let userName = localStorage.getItem('staffName');

            if (!userEmail) {
                window.location.replace('../index.html');
                return; 
            }

            if (userName) {
                const nameParts = userName.split(' ');
                if (nameParts.length > 0) {
                    userName = nameParts[0]; 
                }
            }

            const displayId = userName ? userName : userEmail.split('@')[0];
            document.getElementById('userEmailText').innerText = displayId;
        }

        window.addEventListener('pageshow', function(event) {
            checkAuth();
        });

        document.getElementById('logoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.remove('active');
            overlay.classList.remove('active');

            Swal.fire({
                title: 'ยืนยันการออกจากระบบ?',
                text: "คุณต้องการออกจากระบบใช่หรือไม่",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#dc3545', 
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'ออกจากระบบ',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.href = '../index.html'; 
                }
            });
        });

        checkAuth();