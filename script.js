import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZuwP_9a46AWsxBnVnDCgCF7hF9tcg74s",
    authDomain: "year-5e6a5.firebaseapp.com",
    projectId: "year-5e6a5",
    storageBucket: "year-5e6a5.firebasestorage.app",
    messagingSenderId: "1071298463112",
    appId: "1:1071298463112:web:75704f169d255f0be1074a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let currentData = null;
let step = 0;
let photoDataUrls = []; // 현재 업로드 대기중인 데이터
let selectedQuizPhotoIdx = null;

/* =========================================
   [관리자] 기능 (index.html)
   ========================================= */

async function loginAdmin() {
    const f = document.getElementById('adminFamilyGroup').value.trim();
    const p = document.getElementById('adminPassword').value.trim();
    if (!f || !p) return alert("가족 이름과 비밀번호를 입력하세요! 😊");

    try {
        const adminRef = doc(db, "admins", f);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
            if (confirm(`'${f}' 가족 방을 새로 만들까요?`)) {
                await setDoc(adminRef, { pw: p });
            } else return;
        } else if (adminSnap.data().pw !== p) {
            return alert("비밀번호가 틀려요! 😢");
        }

        localStorage.setItem('editingFamily', f);
        document.getElementById('adminLoginScreen').classList.remove('active');
        document.getElementById('adminEditScreen').classList.add('active');
        document.getElementById('currentEditingFamily').innerText = `❤️ ${f} 관리 화면 ❤️`;
        createAdminMonthButtons();
    } catch (e) { alert("접속 중 오류 발생!"); }
}

function createAdminMonthButtons() {
    const grid = document.getElementById('adminMonthGrid');
    if(!grid) return;
    grid.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = "m-btn"; 
        btn.innerText = `${i}월`;
        btn.style.cursor = "pointer";
        btn.onclick = () => {
            document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('selectedMonth').value = i;
            loadExistingData(i); // [핵심] 해당 월의 데이터를 불러옵니다.
        };
        grid.appendChild(btn);
    }
}

// [핵심 기능] 기존에 등록된 사진과 퀴즈를 불러와 화면에 표시
async function loadExistingData(month) {
    const family = localStorage.getItem('editingFamily');
    const docRef = doc(db, "memories", `${family}_${month}`);
    
    // 일단 입력창 초기화
    resetAdminInputs();

    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // 1. 퀴즈 정보 입력
            document.getElementById('quizTitle').value = data.quiz || "";
            document.getElementById('quizAns').value = data.ans || "";
            const optInputs = document.querySelectorAll('.opt');
            if(data.opts) {
                data.opts.forEach((val, idx) => { if(optInputs[idx]) optInputs[idx].value = val; });
            }

            // 2. 사진 정보 표시
            const container = document.getElementById('imagePreviewContainer');
            photoDataUrls = data.photos || [];
            selectedQuizPhotoIdx = photoDataUrls.length - 1; // 마지막 사진이 퀴즈 사진으로 저장됨

            photoDataUrls.forEach((url, index) => {
                const div = document.createElement('div');
                div.className = "preview-item";
                const isQuizImg = (index === selectedQuizPhotoIdx);
                div.innerHTML = `
                    <img src="${url}" id="prev_${index}" onclick="window.selectQuizPhoto(${index})" style="cursor:pointer; border-color: ${isQuizImg ? '#ff6b6b' : 'transparent'}">
                    <span class="badge" id="badge_${index}" style="display: ${isQuizImg ? 'block' : 'none'}">퀴즈 사진</span>
                `;
                container.appendChild(div);
            });
            console.log(`${month}월 데이터를 성공적으로 불러왔습니다.`);
        }
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }
}

function resetAdminInputs() {
    photoDataUrls = [];
    selectedQuizPhotoIdx = null;
    document.getElementById('imagePreviewContainer').innerHTML = "";
    document.getElementById('photoInput').value = "";
    document.getElementById('quizTitle').value = "";
    document.querySelectorAll('.opt').forEach(opt => opt.value = "");
    document.getElementById('quizAns').value = "";
}

async function saveData() {
    const f = localStorage.getItem('editingFamily');
    const m = document.getElementById('selectedMonth').value;
    const q = document.getElementById('quizTitle').value;
    const ans = document.getElementById('quizAns').value;
    const opts = Array.from(document.querySelectorAll('.opt')).map(o => o.value);

    if (!m || photoDataUrls.length === 0 || selectedQuizPhotoIdx === null) return alert("필수 정보를 모두 입력하세요!");

    alert("추억을 저장 중입니다... ⏳");
    try {
        const finalUrls = [];
        // 새로 선택된 사진(data_url)은 업로드하고, 기존 URL은 그대로 유지
        for (let i = 0; i < photoDataUrls.length; i++) {
            if (photoDataUrls[i].startsWith('http')) {
                finalUrls.push(photoDataUrls[i]);
            } else {
                const sRef = ref(storage, `photos/${f}/${m}/${Date.now()}_${i}.jpg`);
                await uploadString(sRef, photoDataUrls[i], 'data_url');
                finalUrls.push(await getDownloadURL(sRef));
            }
        }
        
        // 퀴즈 사진을 맨 뒤로 보내는 로직 유지
        const quizImg = finalUrls[selectedQuizPhotoIdx];
        const otherPhotos = finalUrls.filter((_, i) => i !== selectedQuizPhotoIdx);
        const sortedPhotos = [...otherPhotos, quizImg];

        await setDoc(doc(db, "memories", `${f}_${m}`), {
            family: f, month: parseInt(m), photos: sortedPhotos, quiz: q, opts: opts, ans: ans
        });
        alert(`${m}월 저장 완료! 💾`);
    } catch (e) { alert("저장 실패!"); console.error(e); }
}

/* =========================================
   [사용자] 기능 (memory.html)
   ========================================= */

async function startApp() {
    const f = document.getElementById('targetFamily').value.trim();
    const u = document.getElementById('userName').value.trim();
    if (!f || !u) return alert("정보를 모두 입력해주세요! 😊");

    try {
        const q = query(collection(db, "memories"), where("family", "==", f));
        const snap = await getDocs(q);
        if (snap.empty) return alert(`'${f}' 가족의 데이터를 찾을 수 없습니다!`);

        localStorage.setItem('currentFamily', f);
        document.getElementById('startScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
        document.getElementById('welcomeMsg').innerText = `🏠 ${f} 추억 여행`;

        const bar = document.getElementById('userMonthBar');
        bar.innerHTML = "";
        const memories = [];
        snap.forEach(doc => memories.push(doc.data()));
        memories.sort((a, b) => a.month - b.month);

        memories.forEach(data => {
            const btn = document.createElement('button');
            btn.className = "month-btn"; 
            btn.innerText = `${data.month}월`;
            btn.style.cursor = "pointer"; 
            btn.onclick = () => {
                document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active-month'));
                btn.classList.add('active-month');
                currentData = data; step = 0;
                showContent();
            };
            bar.appendChild(btn);
        });
    } catch (e) { alert("조회 오류!"); }
}

function showContent() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    if (step < currentData.photos.length - 1) {
        viewer.innerHTML = `<img src="${currentData.photos[step]}" class="photo-view" onclick="window.nextStep()" style="width:100%; border-radius:15px; cursor:pointer;">`;
        info.innerText = `📷 사진 ${step + 1} / ${currentData.photos.length - 1}`;
    } else {
        viewer.innerHTML = `
            <div style="text-align:center; margin-bottom:15px;">
                <p style="font-weight:bold; color:var(--primary); margin-bottom:10px;">✨ 여기서 잠깐! 퀴즈 타임!</p>
                <img src="${currentData.photos[currentData.photos.length-1]}" class="quiz-img" style="width:100%; border-radius:15px;">
                <h3 style="margin-top:15px;">Q. ${currentData.quiz}</h3>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${currentData.opts.map((o, i) => `<button class="opt-btn" onclick="window.checkAnswer(${i+1})" style="cursor:pointer;">${i+1}. ${o}</button>`).join('')}
            </div>`;
        info.innerText = "";
    }
}

/* =========================================
   [공통] 외부 연결
   ========================================= */

window.loginAdmin = loginAdmin;
window.saveData = saveData;
window.startApp = startApp;
window.nextStep = () => { step++; showContent(); };
window.checkAnswer = (ans) => alert(ans == currentData.ans ? "정답입니다! 🎉" : "틀렸어요! 😢");

window.previewImages = function(input) {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = ""; photoDataUrls = [];
    Array.from(input.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div'); div.className = "preview-item";
            div.innerHTML = `<img src="${e.target.result}" id="prev_${index}" onclick="window.selectQuizPhoto(${index})" style="cursor:pointer;"><span class="badge" id="badge_${index}">퀴즈 사진</span>`;
            container.appendChild(div); photoDataUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
    });
};

window.selectQuizPhoto = function(idx) {
    selectedQuizPhotoIdx = idx;
    document.querySelectorAll('.preview-item img').forEach(img => img.style.borderColor = "transparent");
    document.querySelectorAll('.badge').forEach(b => b.style.display = "none");
    document.getElementById(`prev_${idx}`).style.borderColor = "#ff6b6b";
    document.getElementById(`badge_${idx}`).style.display = "block";
};