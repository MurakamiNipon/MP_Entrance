import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, setDoc, doc, getDocs, getDoc, updateDoc, serverTimestamp } 
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
const COLLECTION_NAME = "english_exam"; 
const STUDENT_COLLECTION = "student";

let allStudents = [];

async function loadStudents() {
    const selectEl = document.getElementById('studentSelect');
    selectEl.innerHTML = '<option value="">... กำลังโหลดรายชื่อ ...</option>';
    
    try {
        const stdSnapshot = await getDocs(collection(db, STUDENT_COLLECTION));
        
        allStudents = [];
        stdSnapshot.forEach((doc) => {
            const data = doc.data();
            allStudents.push({ 
                id: doc.id, 
                order: data.order, 
                name: data.name, 
                university: data.university, 
                major: data.major,
                hasEnglishScore: data.hasEnglishScore || false 
            });
        });

        allStudents.sort((a, b) => parseInt(a.order) - parseInt(b.order));

        selectEl.innerHTML = '<option value="">-- กรุณาเลือกรายชื่อ --</option>';
        
        allStudents.forEach(st => {
            const opt = document.createElement('option');
            opt.value = st.id; 
            opt.text = st.name;
            
            if (st.hasEnglishScore) { 
                opt.style.color = '#c62828';
                opt.style.fontWeight = 'bold'; 
            }
            selectEl.appendChild(opt);
        });

    } catch (error) { 
        console.error("Error loading students:", error);
        selectEl.innerHTML = '<option value="">Error Loading Data</option>';
    }
}

document.getElementById('studentSelect').addEventListener('change', function(e) {
    const student = allStudents.find(s => s.id === e.target.value);
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
    
    input.addEventListener('change', function() {
        let val = parseFloat(this.value);
        if (isNaN(val)) return;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        this.value = val;
        calculateFormTotal();
    });
});

function calculateFormTotal() {
    let reading = parseFloat(document.getElementById('readingScore').value) || 0;
    let writing = parseFloat(document.getElementById('writingScore').value) || 0;
    
    if(reading > 100) reading = 100;
    if(writing > 100) writing = 100;
    if(reading < 0) reading = 0;
    if(writing < 0) writing = 0;

    let total = reading + writing;
    document.getElementById('displayTotal').innerText = total.toFixed(2);
}

document.getElementById('btnClear').addEventListener('click', () => {
    Swal.fire({
        title: 'ยืนยันการล้างข้อมูล?',
        text: "ข้อมูลในฟอร์มจะหายไป",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ล้างข้อมูล',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('scoreForm').reset();
            document.getElementById('displayTotal').innerText = "0.00";
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

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const docRef = doc(db, COLLECTION_NAME, studentName);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const confirmResult = await Swal.fire({
                title: 'ข้อมูลซ้ำ! (Data Exists)',
                html: `ผู้เข้าสอบ <b>"${studentName}"</b> มีคะแนนภาษาอังกฤษแล้ว<br>ต้องการบันทึกทับหรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยัน (Overwrite)',
                cancelButtonText: 'ยกเลิก'
            });

            if (!confirmResult.isConfirmed) {
                btn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล (Save)';
                btn.disabled = false;
                return;
            }
        }

        let reading = parseFloat(document.getElementById('readingScore').value) || 0;
        let writing = parseFloat(document.getElementById('writingScore').value) || 0;
        
        if(reading > 100) reading = 100; if(reading < 0) reading = 0;
        if(writing > 100) writing = 100; if(writing < 0) writing = 0;

        let totalScore = parseFloat((reading + writing).toFixed(2));

        const data = {
            studentId: studentId,
            order: document.getElementById('stdOrder').value,
            name: studentName,
            university: document.getElementById('stdUni').value,
            major: document.getElementById('stdMajor').value,
            scores: { reading, writing },
            total: totalScore,
            timestamp: serverTimestamp()
        };

        await setDoc(docRef, data);

        const studentRef = doc(db, STUDENT_COLLECTION, studentId);
        await updateDoc(studentRef, {
            hasEnglishScore: true
        });
        
        Swal.fire({ 
            icon: 'success', 
            title: 'บันทึกสำเร็จ!', 
            text: `คะแนนภาษาอังกฤษของ ${studentName} บันทึกเรียบร้อย`,
            timer: 2000, 
            showConfirmButton: false 
        });
        
        const selectEl = document.getElementById('studentSelect');
        const selectedOption = selectEl.querySelector(`option[value="${studentId}"]`);
        if (selectedOption) {
            selectedOption.style.color = '#c62828';
            selectedOption.style.fontWeight = 'bold';
            
            const stInArray = allStudents.find(s => s.id === studentId);
            if(stInArray) stInArray.hasEnglishScore = true;
        }

        document.getElementById('scoreForm').reset();
        document.getElementById('displayTotal').innerText = "0.00";

    } catch (error) { 
        console.error(error); 
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล (Save)';
        btn.disabled = false;
    }
});

loadStudents();