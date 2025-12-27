<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyB4ll9r_XCTntPbUQSTk1wCwxDsSgH-vHw",
    authDomain: "year-3ee7e.firebaseapp.com",
    projectId: "year-3ee7e",
    storageBucket: "year-3ee7e.firebasestorage.app",
    messagingSenderId: "1071298463112",
    appId: "1:1071298463112:web:fbe8a3fe986a0ae1b5663d"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>

let photoDataUrls = [];
let selectedQuizPhotoIdx = null;
let currentData = null;
let step = 0;

/* --- 관리자 로직 --- */
function loginAdmin() {
    const f = document.getElementById('adminFamilyGroup').value.trim();
    const p = document.getElementById('adminPassword').value.trim();
    if (!f || !p) return alert("이름과 비번을 입력해주세요! 😊");

    const stored = localStorage.getItem(`${f}_adminPw`);
    if (!stored) {
        if (confirm(`'${f}' 방을 새로 만들까요?`)) localStorage.setItem(`${f}_adminPw`, p);
        else return;
    } else if (stored !== p) return alert("비밀번호가 틀려요! 😢");

    localStorage.setItem('editingFamily', f);
    document.getElementById('adminLoginScreen').classList.remove('active');
    document.getElementById('adminEditScreen').classList.add('active');
    document.getElementById('currentEditingFamily').innerText = `❤️ ${f} 가족 저장소 ❤️`;
    createAdminMonthButtons();
}

function createAdminMonthButtons() {
    const grid = document.getElementById('adminMonthGrid');
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

function previewImages(input) {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = ""; photoDataUrls = []; selectedQuizPhotoIdx = null;
    Array.from(input.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div'); div.className = "preview-item";
            div.innerHTML = `<img src="${e.target.result}" id="prev_${index}" onclick="selectQuizPhoto(${index})"><span class="badge" id="badge_${index}">퀴즈 사진</span>`;
            container.appendChild(div); photoDataUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function selectQuizPhoto(idx) {
    selectedQuizPhotoIdx = idx;
    document.querySelectorAll('.preview-item img').forEach(img => img.style.borderColor = "transparent");
    document.querySelectorAll('.badge').forEach(b => b.style.display = "none");
    document.getElementById(`prev_${idx}`).style.borderColor = "#ff6b6b";
    document.getElementById(`badge_${idx}`).style.display = "block";
}

function saveData() {
    const f = localStorage.getItem('editingFamily');
    const m = document.getElementById('selectedMonth').value;
    const q = document.getElementById('quizTitle').value;
    const ans = document.getElementById('quizAns').value;
    const opts = Array.from(document.querySelectorAll('.opt')).map(o => o.value);

    if (!m || photoDataUrls.length === 0 || selectedQuizPhotoIdx === null) return alert("월 선택과 퀴즈 사진 선택은 필수입니다! 📸");

    const quizImg = photoDataUrls[selectedQuizPhotoIdx];
    const others = photoDataUrls.filter((_, i) => i !== selectedQuizPhotoIdx);
    const finalPhotos = [...others, quizImg];

    localStorage.setItem(`${f}_monthData_${m}`, JSON.stringify({ photos: finalPhotos, quiz: q, opts, ans }));
    alert(`${m}월 추억 저장 완료! 💾`);
}

/* --- 사용자 로직 --- */
function startApp() {
    const f = document.getElementById('targetFamily').value.trim();
    const u = document.getElementById('userName').value.trim();
    if (!f || !u) return alert("정보를 모두 입력해주세요! 😊");

    let exists = false;
    for(let i=1; i<=12; i++) { if(localStorage.getItem(`${f}_monthData_${i}`)) { exists = true; break; } }
    if (!exists) return alert(`'${f}' 가족의 추억이 아직 없거나 이름이 틀려요! 🤔`);

    localStorage.setItem('currentFamily', f);
    localStorage.setItem('currentUser', u);
    document.getElementById('welcomeMsg').innerText = `🏠 ${f}네 추억 여행 중`;
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
    renderUserMonthButtons();
}

function renderUserMonthButtons() {
    const bar = document.getElementById('userMonthBar');
    const f = localStorage.getItem('currentFamily');
    bar.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const raw = localStorage.getItem(`${f}_monthData_${i}`);
        if (raw) {
            const btn = document.createElement('button');
            btn.className = "month-btn"; btn.innerText = `${i}월`;
            btn.onclick = () => {
                document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active-month'));
                btn.classList.add('active-month');
                currentData = JSON.parse(raw); currentData.month = i; step = 0;
                document.getElementById('resultBtn').style.display = "none";
                showContent();
            };
            bar.appendChild(btn);
        }
    }
}

function showContent() {
    const viewer = document.getElementById('viewer');
    const info = document.getElementById('pageInfo');
    if (step < currentData.photos.length - 1) {
        viewer.innerHTML = `<img src="${currentData.photos[step]}" class="photo-view" onclick="step++; showContent();" style="cursor:pointer;">`;
        info.innerText = `📷 사진 ${step + 1} / ${currentData.photos.length - 1} (터치하면 다음)`;
    } else { showQuiz(); }
}

function showQuiz() {
    const viewer = document.getElementById('viewer');
    viewer.innerHTML = `
        <div class="quiz-container">
            <img src="${currentData.photos[currentData.photos.length-1]}" class="quiz-img">
            <h3 style="text-align:center;">❓ ${currentData.quiz}</h3>
            ${currentData.opts.map((opt, i) => `<button class="opt-btn" onclick="checkAnswer(${i+1})">${i+1}. ${opt}</button>`).join('')}
        </div>`;
    if (currentData.month == 12) document.getElementById('resultBtn').style.display = "block";
}

function checkAnswer(ans) {
    const correct = (ans == currentData.ans);
    alert(correct ? "정답이야! 🎉" : `아쉬워요! 정답은 ${currentData.ans}번! 😢`);
    const f = localStorage.getItem('currentFamily');
    const n = localStorage.getItem('currentUser');
    let sc = JSON.parse(localStorage.getItem(`${f}_quizScores`) || '[]');
    sc.push({ name: n, correct });
    localStorage.setItem(`${f}_quizScores`, JSON.stringify(sc));
}

function showFinalResult() {
    const f = localStorage.getItem('currentFamily');
    const sc = JSON.parse(localStorage.getItem(`${f}_quizScores`) || '[]');
    const rank = sc.reduce((acc, c) => { if(c.correct) acc[c.name] = (acc[c.name] || 0) + 1; return acc; }, {});
    const sorted = Object.entries(rank).sort((a,b) => b[1] - a[1]);
    let t = `🏆 ${f} 가족 최종 순위 🏆\n\n`;
    sorted.forEach((p, i) => t += `${i+1}등: ${p[0]} (${p[1]}점)\n`);
    alert(t || "아직 정답자가 없어요!");
}