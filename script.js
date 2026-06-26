
        // ==========================================
        // CHICK'S MAGIC RUN - Complete Engine
        // ==========================================

        // --- Canvas Setup ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const W = 800;
        const H = 400;
        canvas.width = W;
        canvas.height = H;

        // --- DOM Elements ---
        const hudScore = document.getElementById('hudScore');
        const hudBest = document.getElementById('hudBest');
        const diamondCountLabel = document.getElementById('diamondCountLabel');
        const restartBtn = document.getElementById('restartBtn');
        const resetBestBtn = document.getElementById('resetBestBtn'); // دکمه ریست جدید

        // --- Audio ---
        let audioCtx = null;
        function playTone(freq, duration, type = 'square', vol = 0.15) {
            try {
                if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = type;
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(vol, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) {}
        }
        function playJumpSound() { playTone(350, 0.1); setTimeout(() => playTone(500, 0.1), 50); }
        function playCollectSound() { playTone(880, 0.1); setTimeout(() => playTone(1200, 0.1), 80); }
        function playGameOverSound() { playTone(400, 0.3, 'sawtooth', 0.1); setTimeout(() => playTone(300, 0.3, 'sawtooth', 0.1), 200); }

        // --- Game State ---
        let state = 'idle';
        let score = 0;
        let bestScore = parseInt(localStorage.getItem('chickRunBest')) || 0;
        let diamondCount = 0;
        let speed = 5;
        let baseSpeed = 5;
        let gravity = 800;
        let jumpPower = -420;
        let groundY = 340;
        let gameTime = 0;
        let obstacleTimer = 0;
        let diamondTimer = 0;
        let maxJumps = 2;

        const player = { x: 100, y: groundY, width: 30, height: 34, vy: 0, jumpCount: 0, grounded: true };
        let obstacles = [];
        let diamonds = [];
        let clouds = [];
        let particles = [];

        // --- Helpers ---
        function random(min, max) { return Math.random() * (max - min) + min; }
        function randomInt(min, max) { return Math.floor(random(min, max + 1)); }
        function rectCollide(r1, r2) {
            return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
        }
        function spawnParticles(x, y, color, count = 10) {
            for (let i = 0; i < count; i++) particles.push({ x, y, vx: random(-120, 120), vy: random(-180, -30), life: random(0.4, 0.9), maxLife: random(0.4, 0.9), size: random(3, 7), color });
        }

        // --- Best Score ---
        function updateBestScore() {
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('chickRunBest', bestScore.toString());
            }
            hudBest.innerText = '🏆 ' + bestScore;
        }

        // ==========================================
        // DRAWING FUNCTIONS (VISUALS)
        // ==========================================

        // 1. Draw Cute Chick (جدید، خوشگل و نرم)
        function drawCuteChick(x, y, isGrounded) {
            ctx.save();
            ctx.shadowBlur = 0; // حذف سایه های اضافی برای شفافیت بیشتر

            // --- سایه زیر پا (اگر روی زمین باشد) ---
            if (isGrounded) {
                ctx.fillStyle = 'rgba(0,0,0,0.08)';
                ctx.beginPath();
                ctx.ellipse(x, y + 12, 24, 6, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // --- بدنه اصلی (با گرادینت برای حالت سه‌بعدی و درخشان) ---
            const grdBody = ctx.createRadialGradient(x - 8, y - 10, 5, x, y, 26);
            grdBody.addColorStop(0, '#8BBFFF'); // هایلایت روشن
            grdBody.addColorStop(1, '#4A8DFF'); // رنگ اصلی آبی
            ctx.fillStyle = grdBody;
            ctx.beginPath();
            ctx.ellipse(x, y - 2, 24, 26, 0, 0, Math.PI * 2);
            ctx.fill();

            // --- شکم (بخش روشن‌تر) ---
            ctx.fillStyle = '#A3D0FF';
            ctx.beginPath();
            ctx.ellipse(x, y + 4, 16, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // --- گوشه‌های صورت (گونه‌های صورتی) ---
            ctx.fillStyle = 'rgba(255, 105, 180, 0.4)';
            ctx.beginPath();
            ctx.ellipse(x - 16, y - 6, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x + 16, y - 6, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // --- چشم‌های درشت و بامزه ---
            ctx.fillStyle = '#FFFFFF';
            // چشم چپ
            ctx.beginPath();
            ctx.ellipse(x - 11, y - 14, 9, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            // چشم راست
            ctx.beginPath();
            ctx.ellipse(x + 11, y - 14, 9, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // مردمک‌ها
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(x - 12, y - 12, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 10, y - 12, 4, 0, Math.PI * 2);
            ctx.fill();

            // درخشش چشم‌ها (نقطه‌های سفید کوچک برای زیبایی)
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x - 14, y - 16, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 8, y - 16, 2, 0, Math.PI * 2);
            ctx.fill();

            // --- نوک (منقار نارنجی) ---
            ctx.fillStyle = '#FFB74D';
            ctx.strokeStyle = '#E65100';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y - 6);
            ctx.lineTo(x + 14, y - 8);
            ctx.lineTo(x, y + 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // --- پاها (فقط وقتی روی زمین است) ---
            if (isGrounded) {
                ctx.fillStyle = '#FFB74D';
                ctx.strokeStyle = '#E65100';
                ctx.lineWidth = 1;
                // پای چپ
                ctx.beginPath();
                ctx.ellipse(x - 10, y + 20, 6, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // پای راست
                ctx.beginPath();
                ctx.ellipse(x + 10, y + 20, 6, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // --- بال‌ها (با حرکت بالا و پایین ملایم در زمان پرش) ---
            const wingFlap = isGrounded ? 0 : Math.sin(gameTime * 10) * 3;
            ctx.fillStyle = '#3B8BDB'; // آبی تیره‌تر برای بال
            // بال چپ
            ctx.beginPath();
            ctx.ellipse(x - 26, y - 4 + wingFlap, 5, 14, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // بال راست
            ctx.beginPath();
            ctx.ellipse(x + 26, y - 4 + wingFlap, 5, 14, 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // 2. Draw Trees (Sharpened)
        function drawObstacle(o) {
            const x = o.x, y = o.y, type = o.type;
            ctx.shadowBlur = 0;

            if (type === 'pine') {
                ctx.fillStyle = '#6B4C3A'; ctx.fillRect(x - 4, y - 20, 8, 20);
                ctx.fillStyle = '#1E5631';
                ctx.beginPath(); ctx.moveTo(x, y - 60); ctx.lineTo(x - 25, y - 20); ctx.lineTo(x + 25, y - 20); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#2D7A43';
                ctx.beginPath(); ctx.moveTo(x, y - 45); ctx.lineTo(x - 20, y - 10); ctx.lineTo(x + 20, y - 10); ctx.closePath(); ctx.fill();
            } else if (type === 'blossom') {
                ctx.fillStyle = '#6B4C3A'; ctx.fillRect(x - 3, y - 15, 6, 15);
                ctx.fillStyle = '#F4A4CE';
                ctx.beginPath(); ctx.arc(x, y - 30, 22, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#E892C0'; ctx.beginPath(); ctx.arc(x - 10, y - 35, 15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + 12, y - 32, 14, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FFD700';
                for(let i=0; i<6; i++) { let ang = (i / 6) * Math.PI * 2 + gameTime * 0.2; ctx.beginPath(); ctx.arc(x + Math.cos(ang)*16, y - 30 + Math.sin(ang)*16, 3, 0, Math.PI*2); ctx.fill(); }
            } else if (type === 'dome') {
                ctx.fillStyle = '#6B4C3A'; ctx.fillRect(x - 4, y - 12, 8, 12);
                ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.arc(x, y - 30, 24, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#388E3C'; ctx.beginPath(); ctx.arc(x - 8, y - 35, 16, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#66BB6A'; ctx.beginPath(); ctx.arc(x + 10, y - 32, 14, 0, Math.PI * 2); ctx.fill();
            } else if (type === 'cactus') {
                ctx.fillStyle = '#4CAF50'; ctx.fillRect(x - 8, y - 30, 16, 30); ctx.fillRect(x - 18, y - 20, 10, 10); ctx.fillRect(x + 8, y - 25, 10, 15);
                ctx.fillStyle = '#388E3C'; ctx.fillRect(x - 16, y - 22, 6, 6); ctx.fillRect(x + 10, y - 27, 6, 8);
                ctx.fillStyle = '#2E7D32';
                for(let i=0; i<5; i++) { let yy = y - 10 - i*5; ctx.fillRect(x - 12, yy, 4, 2); ctx.fillRect(x + 8, yy, 4, 2); }
            }
        }

        // 3. Draw Diamond
        function drawDiamond(d) {
            const x = d.x, y = d.y, s = d.size || 12;
            const shimmer = Math.sin(gameTime * 4 + d.shimmerOffset) * 0.3 + 0.7;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#00b8d4'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.6, y); ctx.lineTo(x, y + s * 0.6); ctx.lineTo(x - s * 0.6, y); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(x - s * 0.2, y - s * 0.4); ctx.lineTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.2, y - s * 0.4); ctx.lineTo(x, y - s * 0.2); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'white'; let ang = gameTime * 3 + d.shimmerOffset; let sx = x + Math.cos(ang) * s * 0.5, sy = y + Math.sin(ang) * s * 0.5; ctx.beginPath(); ctx.arc(sx, sy, 2 * shimmer, 0, Math.PI * 2); ctx.fill();
        }

        // 4. Draw Background
        function drawBackground() {
            let grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#8cb8e8'); grd.addColorStop(0.6, '#d4efff'); grd.addColorStop(1, '#f6f9d7'); ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; clouds.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(c.x - c.r*0.6, c.y + c.r*0.2, c.r*0.7, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(c.x + c.r*0.6, c.y + c.r*0.1, c.r*0.8, 0, Math.PI*2); ctx.fill(); });
            ctx.fillStyle = '#7ed957'; ctx.fillRect(0, groundY, W, H - groundY);
            ctx.fillStyle = '#5cb85c'; for (let i = 0; i < W; i += 20) { let offset = (i + gameTime * 0.5 * speed) % 20; ctx.fillRect(i, groundY + 5, 2, 6); ctx.fillRect(i + 10, groundY + 12, 3, 4); }
            let grdGnd = ctx.createLinearGradient(0, groundY, 0, H); grdGnd.addColorStop(0, 'rgba(0,0,0,0.0)'); grdGnd.addColorStop(1, 'rgba(0,0,0,0.1)'); ctx.fillStyle = grdGnd; ctx.fillRect(0, groundY, W, H - groundY);
        }

        // --- Game Logic ---
        function resetGame() {
            score = 0; diamondCount = 0; speed = baseSpeed; gameTime = 0; obstacleTimer = 0; diamondTimer = 0;
            player.y = groundY; player.vy = 0; player.jumpCount = 0; player.grounded = true;
            obstacles = []; diamonds = []; particles = [];
            hudScore.innerText = '0'; diamondCountLabel.innerText = '0';
            updateBestScore(); restartBtn.classList.add('hidden');
        }

        function gameOver() {
            state = 'gameover'; playGameOverSound(); updateBestScore(); restartBtn.classList.remove('hidden');
        }

        function handleJump() {
            if (state === 'idle') { resetGame(); state = 'playing'; player.vy = jumpPower; player.jumpCount++; player.grounded = false; playJumpSound(); if(!audioCtx) audioCtx = new AudioContext(); return; }
            if (state === 'playing') { if (player.jumpCount < maxJumps) { player.vy = jumpPower; player.jumpCount++; player.grounded = false; playJumpSound(); } }
        }

        function update(dt) {
            if (state !== 'playing') return;
            gameTime += dt; const speedPx = speed;

            // سرعت بازی (افزایش تدریجی)
            if (score > 0 && score % 5 === 0) { speed = Math.min(baseSpeed + score / 5, 14); }

            // فیزیک شخصیت
            player.vy += gravity * dt; player.y += player.vy * dt;
            if (player.y >= groundY) { player.y = groundY; player.vy = 0; player.grounded = true; player.jumpCount = 0; } else { player.grounded = false; }

            // ایجاد موانع و الماس
            obstacleTimer -= dt; if (obstacleTimer <= 0) { let types = ['pine', 'blossom', 'dome', 'cactus']; let type = types[randomInt(0, types.length - 1)]; obstacles.push({ x: W + 50, y: groundY, w: 30, h: 60, type }); obstacleTimer = random(1.2, 2.5) / (speed / baseSpeed); }
            diamondTimer -= dt; if (diamondTimer <= 0) { diamonds.push({ x: W + 50, y: random(groundY - 60, groundY - 20), size: 12, shimmerOffset: random(0, Math.PI * 2) }); diamondTimer = random(0.8, 1.8) / (speed / baseSpeed); }

            // آپدیت المان‌های متحرک
            for (let i = obstacles.length - 1; i >= 0; i--) { obstacles[i].x -= speedPx * dt * 60; if (obstacles[i].x < -50) obstacles.splice(i, 1); }
            for (let i = diamonds.length - 1; i >= 0; i--) { diamonds[i].x -= speedPx * dt * 60; if (diamonds[i].x < -50) diamonds.splice(i, 1); }
            clouds.forEach(c => { c.x -= speedPx * dt * 60 * 0.3; if (c.x < -80) { c.x = W + 80; c.y = random(20, 120); } });
            for (let i = particles.length - 1; i >= 0; i--) { let p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }

            // تشخیص برخورد (با موانع)
            const pw = player.width * 0.6, ph = player.height * 0.6; const px = player.x - pw / 2, py = player.y - ph + 5;
            for (let i = 0; i < obstacles.length; i++) { let o = obstacles[i]; const ow = o.w * 0.7, oh = o.h * 0.7; if (rectCollide({x: px, y: py, w: pw, h: ph}, {x: o.x - ow/2, y: o.y - oh, w: ow, h: oh})) { gameOver(); return; } }

            // تشخیص برخورد (با الماس) و افزایش امتیاز
            for (let i = diamonds.length - 1; i >= 0; i--) {
                let d = diamonds[i]; const ds = d.size;
                if (rectCollide({x: px, y: py, w: pw, h: ph}, {x: d.x - ds, y: d.y - ds, w: ds*2, h: ds*2})) {
                    diamonds.splice(i, 1);
                    diamondCount++;
                    score++; // هر الماس معادل ۱ امتیاز است
                    playCollectSound(); spawnParticles(d.x, d.y, '#00e5ff', 15); updateBestScore();
                    hudScore.innerText = score; diamondCountLabel.innerText = diamondCount;
                }
            }
        }

        function render() {
            ctx.clearRect(0, 0, W, H); drawBackground();
            obstacles.forEach(o => drawObstacle(o)); diamonds.forEach(d => drawDiamond(d));
            particles.forEach(p => { ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
            
            // تغییر مهم: استفاده از اواتار جدید
            drawCuteChick(player.x, player.y, player.grounded);
        }

        // --- Game Loop ---
        let lastTime = 0;
        function gameLoop(time) {
            let dt = Math.min((time - lastTime) / 1000, 0.03); if (dt <= 0) dt = 0.016; lastTime = time;
            update(dt); render(); requestAnimationFrame(gameLoop);
        }

        // --- Inputs & Events ---
        function handleInput(e) { e.preventDefault(); if (e.type === 'keydown') { if (e.key === 'Space' || e.key === 'ArrowUp') handleJump(); } else { handleJump(); } }
        canvas.addEventListener('click', handleInput); canvas.addEventListener('touchstart', handleInput, { passive: false }); document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false }); document.addEventListener('keydown', handleInput);
        
        restartBtn.addEventListener('click', function(e) { e.stopPropagation(); if (state === 'gameover') { resetGame(); state = 'idle'; restartBtn.classList.add('hidden'); } });

        // === بخش جدید: دکمه ریست کردن بهترین امتیاز (Best Record) ===
        resetBestBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // جلوگیری از فعال شدن پرش با کلیک روی این دکمه
            
            // 1. مقدار متغیر رو صفر میکنیم
            bestScore = 0;
            
            // 2. مقدار توی مرورگر (localStorage) رو آپدیت میکنیم
            localStorage.setItem('chickRunBest', '0');
            
            // 3. توی صفحه نمایش (HUD) رو صفر میکنیم
            hudBest.innerText = '🏆 0';
        });

        // Init Clouds
        for (let i = 0; i < 8; i++) clouds.push({ x: random(0, W), y: random(20, 120), r: random(20, 50) });

        // --- Start ---
        resetGame(); state = 'idle'; requestAnimationFrame(gameLoop);