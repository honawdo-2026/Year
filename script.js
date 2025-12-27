// 1. Firebase 초기화 (아빠의 year-5e6a5 프로젝트)
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

/* --- [관리자 전용] 저장 시 공백 제거 --- */
async function saveData() {
    // .trim()을 사용하여 이름 앞뒤의 불필요한 공백을 삭제합니다.
    const f = localStorage.getItem('editingFamily').trim();
    const m = document.getElementById('selectedMonth').value;
    const q = document.getElementById('quizTitle').value;
    const ans = document.getElementById('quizAns').value;
    const opts = Array.from(document.querySelectorAll('.opt')).map(o => o.value);

    if (!m || photoDataUrls.length === 0 || selectedQuizPhotoIdx === null) return alert("항목을 모두 채워주세요!");

    alert("추억을 저장 중입니다... ⏳");
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
            family: f, // 여기서 공백이 제거된 이름으로 저장됩니다.
            month: parseInt(m),
            photos: finalPhotos,
            quiz: q,
            opts: opts,
            ans: ans
        });
        alert(`${m}월 저장 완료! 💾`);
    } catch (e) { alert("저장 실패!"); }
}

/* --- [사용자 전용] 버튼 안 나오는 문제 해결 --- */
async function startApp() {
    // 입력한 이름에서도 공백을 제거합니다.
    let f = document.getElementById('targetFamily').value.trim();
    const u = document.getElementById('userName').value.trim();

    if (!f || !u) return alert("가족 이름과 본인 이름을 입력하세요! 😊");

    try {
        // 1. 먼저 공백 없는 이름으로 시도
        let q = query(collection(db, "memories"), where("family", "==", f));
        let snap = await getDocs(q);

        // 2. 만약 없다면, 공백이 포함된 이름("우리집 ")으로도 한 번 더 찾아봅니다.
        if (snap.empty) {
            q = query(collection(db, "memories"), where("family", "==", f + " "));
            snap = await getDocs(q);
        }

        if (snap.empty) {
            return alert(`'${f}' 가족의 데이터를 찾을 수 없습니다. 이름을 다시 확인해주세요!`);
        }

        localStorage.setItem('currentFamily', f);
        document.getElementById('startScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
        document.getElementById('welcomeMsg').innerText = `🏠 ${f}네 추억 여행`;

        // 버튼 생성 로직
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

// 화면 표시 및 기타 함수들 (기존과 동일)
function showContent() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    if (step < currentData.photos.length - 1) {
        viewer.innerHTML = `<img src="${currentData.photos[step]}" class="photo-view" onclick="window.nextStep()" style="width:100%; border-radius:15px;">`;
        info.innerText = `📷 사진 ${step + 1} / ${currentData.photos.length - 1}`;
    } else {
        viewer.innerHTML = `<h3>❓ ${currentData.quiz}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${currentData.opts.map((o, i) => `<button onclick="window.checkAnswer(${i+1})" style="padding:15px; border-radius:10px;">${i+1}. ${o}</button>`).join('')}
        </div>`;
    }
}

window.loginAdmin = loginAdmin; // 로그인 함수 등은 이전 코드 참고
window.saveData = saveData;
window.startApp = startApp;
window.nextStep = () => { step++; showContent(); };
window.checkAnswer = (ans) => alert(ans == currentData.ans ? "정답!" : "땡!");