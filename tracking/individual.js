        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getFirestore, collection, getDocs, query, orderBy } 
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

        async function loadData() {
            try {
                const stdSnapshot = await getDocs(collection(db, STUDENT_COLLECTION));
                const students = [];
                stdSnapshot.forEach(doc => {
                    const d = doc.data();
                    students.push({ id: doc.id, ...d });
                });

                students.sort((a, b) => parseInt(a.order) - parseInt(b.order));
                document.getElementById('totalStudents').innerText = students.length;
                const scoreSnapshot = await getDocs(collection(db, INDIVIDUAL_SCORE_COLLECTION));
                document.getElementById('totalAssessments').innerText = scoreSnapshot.size;

                const studentScores = {};
                scoreSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (!studentScores[data.studentId]) {
                        studentScores[data.studentId] = [];
                    }
                    studentScores[data.studentId].push({
                        instructorName: data.instructorName,
                        instructorEmail: data.instructorEmail,
                        decision: data.decision
                    });
                });

                renderTable(students, studentScores);

            } catch (error) {
                console.error("Error:", error);
                Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
            }
        }

        function renderTable(students, studentScores) {
            const tbody = document.getElementById('trackingTableBody');
            tbody.innerHTML = '';

            students.forEach((std) => {
                const tr = document.createElement('tr');
                const assessors = studentScores[std.id] || [];
                let assessorsHtml = '';
                if (assessors.length > 0) {
                    assessorsHtml = `<div class="assessors-grid">`;
                
                    assessors.sort((a, b) => a.instructorName.localeCompare(b.instructorName));

                    assessors.forEach(a => {
                        let icon = '';
                        let tagClass = 'tag-null';
                        if (a.decision === 'pass') {
                            tagClass = 'tag-pass';
                            icon = '<i class="fas fa-check"></i>';
                        } else if (a.decision === 'unsure') {
                            tagClass = 'tag-unsure';
                            icon = '<i class="fas fa-question"></i>';
                        } else if (a.decision === 'fail') {
                            tagClass = 'tag-fail';
                            icon = '<i class="fas fa-times"></i>';
                        }

                        assessorsHtml += `
                            <div class="assessor-tag ${tagClass}" title="${a.instructorEmail}">
                                ${icon} ${a.instructorName}
                            </div>
                        `;
                    });
                    assessorsHtml += `</div>`;
                } else {
                    assessorsHtml = `<span style="color:#ccc; font-style:italic;">- ยังไม่มีการประเมิน -</span>`;
                }

                tr.innerHTML = `
                    <td class="col-order">${std.order}</td>
                    <td class="col-student">
                        <span class="std-name">${std.name}</span>
                        <div class="std-meta">
                            <span><i class="fas fa-university"></i> ${std.university}</span>
                            <span><i class="fas fa-book"></i> ${std.major}</span>
                        </div>
                    </td>
                    <td class="col-count" style="vertical-align: middle;">
                        <span class="count-badge" style="${assessors.length > 0 ? 'background:#e8eaf6; color:#1a237e;' : ''}">${assessors.length}</span>
                    </td>
                    <td class="col-assessors">
                        ${assessorsHtml}
                    </td>
                `;

                tbody.appendChild(tr);
            });
        }

        loadData();