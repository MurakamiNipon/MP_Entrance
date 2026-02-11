        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, collection, getDocs } 
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

        async function loadTrackingData() {
            try {
                const studentSnapshot = await getDocs(collection(db, "student"));
                const totalStudents = studentSnapshot.size;
                document.getElementById('totalStudents').innerText = totalStudents;

                const scoreSnapshot = await getDocs(collection(db, "group_assessment_scores"));
                
                const scoreCounts = {};
                scoreSnapshot.forEach(doc => {
                    const data = doc.data();
                    const email = data.instructorEmail;
                    if(email) {
                        scoreCounts[email] = (scoreCounts[email] || 0) + 1;
                    }
                });

                const staffSnapshot = await getDocs(collection(db, "staff"));
                let instructors = [];
                
                staffSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.role === "Instructor") {
                        instructors.push({
                            name: `${data.name} ${data.surname || ''}`,
                            email: data.email,
                            count: scoreCounts[data.email] || 0 
                        });
                    }
                });

                document.getElementById('totalInstructors').innerText = instructors.length;

                instructors.sort((a, b) => {
                    if (a.count === totalStudents && b.count !== totalStudents) return 1;
                    if (a.count !== totalStudents && b.count === totalStudents) return -1;
                    return a.name.localeCompare(b.name);
                });

                renderTable(instructors, totalStudents);

            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.message, 'error');
            }
        }

        function renderTable(instructors, totalStudents) {
            const tbody = document.getElementById('trackingTable');
            tbody.innerHTML = '';
            
            let completeCount = 0;

            instructors.forEach((inst, index) => {
                const percentage = totalStudents > 0 ? (inst.count / totalStudents) * 100 : 0;
                const isComplete = inst.count >= totalStudents;
                
                if (isComplete) completeCount++;
                let statusClass = 'st-empty';
                let statusText = 'ยังไม่เริ่ม';
                let progressColor = '#c62828';

                if (isComplete) {
                    statusClass = 'st-complete';
                    statusText = 'เรียบร้อย';
                    progressColor = '#2e7d32';
                } else if (inst.count > 0) {
                    statusClass = 'st-pending';
                    statusText = 'กำลังดำเนินการ';
                    progressColor = '#f57f17'; 
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:#888;">${index + 1}</td>
                    <td>
                        <div class="instructor-info">
                            <span class="inst-name">${inst.name}</span>
                            <span class="inst-email">${inst.email}</span>
                        </div>
                    </td>
                    <td>
                        <span class="pg-text">ประเมินแล้ว <b>${inst.count}</b> / ${totalStudents} คน</span>
                        <div class="progress-wrapper">
                            <div class="progress-fill" style="width: ${percentage}%; background-color: ${progressColor};"></div>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('completeCount').innerText = completeCount;
        }

        loadTrackingData();