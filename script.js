// 1. Firebase 초기화
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
let photoDataUrls = [];
let selectedQuizPhotoIdx = null;

/* =========================================
   [관리자] 로그인 및 월별 버튼 생성
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
    } catch (e) { alert("접속 오류 발생!"); }
}

function createAdminMonthButtons() {
    const grid = document.getElementById('adminMonthGrid');
    if(!grid) return;
    grid.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = "m-btn"; btn.innerText = `${i}월`;
        btn.onclick = () => {
            document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('selectedMonth').value = i;
        };
        grid.appendChild(btn);
    }
}

/* =========================================
   [관리자] 사진 미리보기 및 데이터 저장
   ========================================= */
window.previewImages = function(input) {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = ""; photoDataUrls = [];
    Array.from(input.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div'); div.className = "preview-item";
            div.innerHTML = `<img src="${e.target.result}" id="prev_${index}" onclick="selectQuizPhoto(${index})"><span class="badge" id="badge_${index}">퀴즈 사진</span>`;
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

async function saveData() {
    const f = localStorage.getItem('editingFamily');
    const m = document.getElementById('selectedMonth').value;
    const q = document.getElementById('quizTitle').value;
    const ans = document.getElementById('quizAns').value;
    const opts = Array.from(document.querySelectorAll('.opt')).map(o => o.value);

    if (!m || photoDataUrls.length === 0 || selectedQuizPhotoIdx === null) return alert("월 선택과 퀴즈 사진 지정은 필수입니다!");

    alert("추억을 저장 중입니다... 잠시만 기다려주세요! ⏳");
    try {
        const urls = [];
        for (let i = 0; i < photoDataUrls.length; i++) {
            const sRef = ref(storage, `photos/${f}/${m}/${i}.jpg`);
            await uploadString(sRef, photoDataUrls[i], 'data_url');
            urls.push(await getDownloadURL(sRef));
        }
        const quizImg = urls[selectedQuizPhotoIdx];
        const finalPhotos = [...urls.filter((_, i) => i !== selectedQuizPhotoIdx), quizImg];

        await setDoc(doc(db, "memories", `${f}_${m}`), {
            family: f, month: parseInt(m), photos: finalPhotos, quiz: q, opts: opts, ans: ans
        });
        alert(`${m}월 저장 완료! 💾`);
    } catch (e) { alert("저장 실패! 규칙을 확인하세요."); }
}

/* =========================================
   [사용자] 여행 시작 및 월별 버튼 생성 (문제 해결 지점)
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
        document.getElementById('welcomeMsg').innerText = `🏠 ${f}네 추억 여행`;

        // 사용자용 월별 버튼 생성
        const bar = document.getElementById('userMonthBar');
        bar.innerHTML = "";
        const memories = [];
        snap.forEach(doc => memories.push(doc.data()));
        memories.sort((a, b) => a.month - b.month);

        memories.forEach(data => {
            const btn = document.createElement('button');
            btn.className = "month-btn"; 
            btn.innerText = `${data.month}월`;
            btn.onclick = () => {
                document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active-month'));
                btn.classList.add('active-month');
                currentData = data; step = 0;
                showContent();
            };
            bar.appendChild(btn);
        });
    } catch (e) { alert("데이터 조회 오류!"); }
}

function showContent() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    if (step < currentData.photos.length - 1) {
        viewer.innerHTML = `<img src="${currentData.photos[step]}" class="photo-view" onclick="window.nextStep()" style="width:100%; border-radius:15px; cursor:pointer;">`;
        info.innerText = `📷 사진 ${step + 1} / ${currentData.photos.length - 1} (터치하면 다음 사진)`;
    } else {
        showQuiz();
    }
}

function showQuiz() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    info.innerText = "❓ 마지막 퀴즈 타임!";
    viewer.innerHTML = `
        <img src="${currentData.photos[currentData.photos.length-1]}" class="quiz-img" style="width:100%; border-radius:15px;">
        <h3>❓ ${currentData.quiz}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${currentData.opts.map((o, i) => `<button class="opt-btn" onclick="window.checkAnswer(${i+1})">${i+1}. ${o}</button>`).join('')}
        </div>`;
}

// 전역 함수 등록 (HTML에서 호출 가능하도록)
window.loginAdmin = loginAdmin;
window.saveData = saveData;
window.startApp = startApp;
window.nextStep = () => { step++; showContent(); };
window.checkAnswer = (ans) => alert(ans == currentData.ans ? "정답입니다! 🎉" : `틀렸어요! 정답은 ${currentData.ans}번 입니다. 😢`);