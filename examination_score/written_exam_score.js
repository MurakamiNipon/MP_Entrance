import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, setDoc, doc, getDocs, getDoc, serverTimestamp } 
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

const COLLECTION_NAME = "written_exam"; 
const STUDENT_COLLECTION = "student";

let allStudents = [];

async function loadStudents() {
    const selectEl = document.getElementById('studentSelect');
    try {
        const stdSnapshot = await getDocs(collection(db, STUDENT_COLLECTION));
        const examSnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const gradedNames = new Set();
        
        examSnapshot.forEach(doc => {
            gradedNames.add(doc.id); 
        });

        allStudents = [];
        stdSnapshot.forEach((doc) => {
            const data = doc.data();
            allStudents.push({ 
                id: doc.id,
                order: data.order,
                name: data.name,
                university: data.university,
                major: data.major
            });
        });

        allStudents.sort((a, b) => parseInt(a.order) - parseInt(b.order));

        selectEl.innerHTML = '<option value="">-- กรุณาเลือกรายชื่อ --</option>';
        
        allStudents.forEach(st => {
            const opt = document.createElement('option');
            opt.value = st.id;
            opt.text = st.name; 
            if (gradedNames.has(st.name)) {
                opt.style.color = 'red';
                opt.style.fontWeight = 'bold';
            } else {
                opt.style.color = 'black';
            }
            selectEl.appendChild(opt);
        });

    } catch (error) {
        console.error("Error loading students:", error);
        selectEl.innerHTML = '<option value="">Error Loading Data</option>';
    }
}

document.getElementById('studentSelect').addEventListener('change', function(e) {
    const selectedId = e.target.value;
    const student = allStudents.find(s => s.id === selectedId);

    if (student) {
        document.getElementById('stdOrder').value = student.order;
        document.getElementById('stdUni').value = student.university;
        document.getElementById('stdMajor').value = student.major;
        document.getElementById('stdNameHidden').value = student.name; 
    } else {
        document.getElementById('stdOrder').value = "";
        document.getElementById('stdUni').value = "";
        document.getElementById('stdMajor').value = "";
        document.getElementById('stdNameHidden').value = "";
    }
});

const inputs = document.querySelectorAll('.sc-in');
inputs.forEach(input => {
    input.addEventListener('input', calculateFormTotal);
});

function calculateFormTotal(e) {
    let total = 0;
    inputs.forEach(inp => {
        let val = parseInt(inp.value);
        if (isNaN(val)) { val = 0; } 
        else {
            if (val > 1) val = 1;
            if (val < 0) val = 0;
            if (inp.value != val) inp.value = val;
        }
        total += val;
    });
    document.getElementById('displayTotal').innerText = total;
}

document.getElementById('btnClear').addEventListener('click', () => {
    Swal.fire({
        title: 'ยืนยันการล้างข้อมูล?',
        text: "ข้อมูลที่กรอกไว้ในฟอร์มจะหายไปทั้งหมด",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ล้างข้อมูล',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('scoreForm').reset();
            document.getElementById('displayTotal').innerText = "0";
        }
    });
});

document.getElementById('scoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSave');
    
    const studentId = document.getElementById('studentSelect').value;
    const studentName = document.getElementById('stdNameHidden').value; 

    if(!studentId || !studentName) {
        Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้เข้าสอบ' });
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    btn.disabled = true;

    try {
        const docRef = doc(db, COLLECTION_NAME, studentName);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const confirmResult = await Swal.fire({
                title: 'ข้อมูลซ้ำ! (Data Exists)',
                html: `
                    <div style="font-family: 'Sarabun', sans-serif; font-size: 1.1rem; line-height: 1.8; color: #555;">
                        ผู้เข้าสอบ <b>"${studentName}"</b> มีคะแนนในระบบแล้ว<br>
                        <span style="display:block; margin-top:10px;">
                            การบันทึกครั้งนี้จะ <b style="color:#d33; text-decoration: underline;">ทับข้อมูลเดิม</b> ทั้งหมด
                        </span>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยันการทับข้อมูล (Overwrite)',
                cancelButtonText: 'ยกเลิก'
            });

            if (!confirmResult.isConfirmed) {
                btn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล (Save)';
                btn.disabled = false;
                return;
            }
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        let scores = {};
        let totalScore = 0;
        
        for(let i=1; i<=40; i++) {
            let val = parseInt(document.getElementById(`q${i}`).value) || 0;
            if(val > 1) val = 1;
            if(val < 0) val = 0;
            scores[`q${i}`] = val;
            totalScore += val;
        }

        const data = {
            studentId: studentId, 
            order: document.getElementById('stdOrder').value,
            name: studentName,
            university: document.getElementById('stdUni').value,
            major: document.getElementById('stdMajor').value,
            scores: scores,
            total: totalScore,
            timestamp: serverTimestamp()
        };

        await setDoc(docRef, data);

        Swal.fire({ 
            icon: 'success', 
            title: 'บันทึกสำเร็จ!', 
            text: `ข้อมูลของ ${studentName} ถูกบันทึกเรียบร้อยแล้ว`,
            timer: 2000, 
            showConfirmButton: false 
        });

        const selectEl = document.getElementById('studentSelect');
        const selectedOption = selectEl.querySelector(`option[value="${studentId}"]`);
        if (selectedOption) {
            selectedOption.style.color = 'red';
            selectedOption.style.fontWeight = 'bold';
        }

        document.getElementById('scoreForm').reset();
        document.getElementById('displayTotal').innerText = "0";

    } catch (error) {
        console.error("Error:", error);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล (Save)';
        btn.disabled = false;
    }
});

loadStudents();