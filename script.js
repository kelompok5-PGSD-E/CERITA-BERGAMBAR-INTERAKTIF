/* ==========================================================================
   PETUALANGAN BIMA & LALA — KOMIK FLIPBOOK INTERAKTIF
   Core Interactive Engine: Audio, Hotspots, Book Flipping, State
   Media Pembelajaran Literasi & Numerasi Kelas 4 SD
   ========================================================================== */

(function () {
  'use strict';

  // ========== AUDIO SYNTHESIZER (WEB AUDIO API) ==========
  let audioCtx = null;
  let isSoundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.15) {
    if (!isSoundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  function playPageFlipSound() {
    if (!isSoundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const bufferSize = audioCtx.sampleRate * 0.15;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
    } catch (e) {
      console.warn('Flip sound error:', e);
    }
  }

  function playCorrectSound() {
    if (!isSoundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.28, 'triangle', 0.2);
      }, idx * 70);
    });
  }

  function playWrongSound() {
    if (!isSoundEnabled) return;
    playTone(220, 0.25, 'sawtooth', 0.12);
    setTimeout(() => {
      playTone(180, 0.3, 'sawtooth', 0.1);
    }, 120);
  }

  function playVictorySound() {
    if (!isSoundEnabled) return;
    const fanfare = [392, 523.25, 659.25, 783.99];
    fanfare.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.4, 'triangle', 0.22);
      }, idx * 120);
    });
  }

  // ========== BACKGROUND MUSIC (BGM) SYSTEM ==========
  let isMusicEnabled = true;
  let bgmGainNode = null;
  let bgmFilterNode = null;
  let bgmSchedulerId = null;
  let nextBeatTime = 0;
  let currentBeat = 0;
  let isBgmRunning = false;
  let hasCustomAudio = false;

  const BGM_NOTES = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51
  };

  // Cheerful, playful 16-bar children's educational adventure melody (64 beats)
  const BGM_MELODY = [
    'E5','G5','E5','D5',  'C5','D5','E5','G5',  'A5','G5','E5','C5',  'D5','C5','A4','C5',
    'F5','A5','C6','A5',  'G5','F5','E5','D5',  'D5','E5','F5','G5',  'B5','A5','G5','D5',
    'E5','G5','C6','G5',  'E5','D5','C5','E5',  'A5','C6','A5','F5',  'G5','A5','G5','E5',
    'F5','G5','A5','B5',  'D6','C6','B5','G5',  'C5','E5','G5','C6',  'C6','G5','E5','C5'
  ];

  // Soft bass arpeggio accompaniment (64 beats)
  const BGM_BASS = [
    'C3', 'G3', 'E4', 'G3', 'C3', 'G3', 'E4', 'G3',
    'A3', 'E3', 'C4', 'E3', 'A3', 'E3', 'C4', 'E3',
    'F3', 'C4', 'A3', 'C4', 'F3', 'C4', 'A3', 'C4',
    'G3', 'D4', 'B3', 'D4', 'G3', 'D4', 'B3', 'D4',
    'C3', 'G3', 'E4', 'G3', 'C3', 'G3', 'E4', 'G3',
    'F3', 'C4', 'A3', 'C4', 'F3', 'C4', 'A3', 'C4',
    'G3', 'D4', 'B3', 'D4', 'G3', 'D4', 'B3', 'D4',
    'C3', 'G3', 'E4', 'G3', 'C3', 'E4', 'G4', 'C4'
  ];

  const BGM_TEMPO = 106; // Beats per minute
  const BEAT_DURATION = 60 / BGM_TEMPO; // ~0.566s per beat

  function setupBgmGain() {
    if (!audioCtx) return;
    if (!bgmGainNode) {
      bgmGainNode = audioCtx.createGain();
      bgmFilterNode = audioCtx.createBiquadFilter();
      bgmFilterNode.type = 'lowpass';
      bgmFilterNode.frequency.setValueAtTime(2200, audioCtx.currentTime);

      bgmFilterNode.connect(bgmGainNode);
      bgmGainNode.connect(audioCtx.destination);
      bgmGainNode.gain.setValueAtTime(isMusicEnabled ? 0.055 : 0.0001, audioCtx.currentTime);
    }
  }

  function playSynthNote(freq, startTime, duration, type, gainVal, destination) {
    if (!audioCtx || !destination) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch (e) {
      // Audio node scheduling error ignore
    }
  }

  function scheduleBgmBeat(beatIndex, time) {
    if (!audioCtx || !bgmFilterNode) return;

    // 1. Play Bass Note (Warm Soft Sine/Triangle)
    const bassNote = BGM_BASS[beatIndex % BGM_BASS.length];
    if (bassNote && BGM_NOTES[bassNote]) {
      playSynthNote(BGM_NOTES[bassNote], time, BEAT_DURATION * 0.85, 'triangle', 0.042, bgmFilterNode);
    }

    // 2. Play Lead Melody Note (Kalimba/Chime Style Triangle)
    const melNote = BGM_MELODY[beatIndex % BGM_MELODY.length];
    if (melNote && BGM_NOTES[melNote]) {
      playSynthNote(BGM_NOTES[melNote], time, BEAT_DURATION * 0.7, 'triangle', 0.052, bgmFilterNode);
    }

    // 3. Play Soft Offbeat Harmony Chime on alternate beats
    if (beatIndex % 2 === 1) {
      const harmTime = time + BEAT_DURATION * 0.5;
      const harmNote = beatIndex % 4 === 1 ? 'G4' : 'E4';
      if (BGM_NOTES[harmNote]) {
        playSynthNote(BGM_NOTES[harmNote], harmTime, BEAT_DURATION * 0.45, 'sine', 0.02, bgmFilterNode);
      }
    }
  }

  function bgmScheduler() {
    if (!audioCtx || !isBgmRunning) return;

    // Lookahead: schedule notes up to 0.25 seconds ahead
    while (nextBeatTime < audioCtx.currentTime + 0.25) {
      scheduleBgmBeat(currentBeat, nextBeatTime);
      nextBeatTime += BEAT_DURATION;
      currentBeat = (currentBeat + 1) % 64;
    }
  }

  function startSynthBgm() {
    if (hasCustomAudio) return;
    initAudio();
    if (!audioCtx) return;

    setupBgmGain();
    if (bgmGainNode) {
      bgmGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      bgmGainNode.gain.linearRampToValueAtTime(0.055, audioCtx.currentTime + 0.3);
    }

    if (!isBgmRunning) {
      isBgmRunning = true;
      nextBeatTime = audioCtx.currentTime + 0.05;
      currentBeat = 0;
      if (bgmSchedulerId) clearInterval(bgmSchedulerId);
      bgmSchedulerId = setInterval(bgmScheduler, 30);
    }
  }

  function stopSynthBgm() {
    if (bgmGainNode && audioCtx) {
      bgmGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      bgmGainNode.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
    }
    isBgmRunning = false;
    if (bgmSchedulerId) {
      clearInterval(bgmSchedulerId);
      bgmSchedulerId = null;
    }
  }

  function startBgm() {
    if (!isMusicEnabled) return;

    const bgmAudioEl = document.getElementById('bgmAudio');
    if (hasCustomAudio && bgmAudioEl) {
      bgmAudioEl.play().catch(() => {});
    } else {
      startSynthBgm();
    }
  }

  function pauseBgm() {
    const bgmAudioEl = document.getElementById('bgmAudio');
    if (hasCustomAudio && bgmAudioEl) {
      bgmAudioEl.pause();
    } else {
      stopSynthBgm();
    }
  }

  function checkCustomAudio() {
    const bgmAudioEl = document.getElementById('bgmAudio');
    if (!bgmAudioEl) return;
    bgmAudioEl.src = 'musik.mp3';
    bgmAudioEl.volume = 0.35;

    bgmAudioEl.addEventListener('canplaythrough', () => {
      hasCustomAudio = true;
      stopSynthBgm();
      if (isMusicEnabled) {
        bgmAudioEl.play().catch(() => {});
      }
    }, { once: true });

    bgmAudioEl.addEventListener('error', () => {
      hasCustomAudio = false;
      if (isMusicEnabled) {
        startSynthBgm();
      }
    }, { once: true });

    bgmAudioEl.load();
  }

  // ========== DATA SLIDE BUKU (15 HALAMAN) ==========
  const slides = [
    // 1 — Cover
    {
      type: 'cover',
      chapter: 'Sampul Depan',
      image: 'gambar/cover.jpeg',
      hint: 'Tekan tombol "Selanjutnya ▶" di sebelah kanan untuk mulai membaca!',
    },
    // 2 — Petunjuk Penggunaan
    {
      type: 'comic',
      chapter: 'Petunjuk Penggunaan',
      image: 'gambar/PETUNJUK.jpeg',
      hint: '📖 Pelajari petunjuk di atas, lalu tekan "Selanjutnya ▶" untuk mulai petualangan!',
    },
    // 3 — Awal Petualangan (di sekolah)
    {
      type: 'comic',
      chapter: 'Awal Petualangan',
      image: 'gambar/hal-2.jpeg',
      hint: 'Bima dan Lala bersiap pergi ke Pasar Ceria untuk belajar berhitung!',
    },
    // 4 — Di Pasar Ceria (bertemu penjual buah)
    {
      type: 'comic',
      chapter: 'Di Pasar Ceria',
      image: 'gambar/hal-3.jpeg',
      hint: 'Bima dan Lala melihat apel segar di pasar. Berapa banyak ya?',
    },
    // 5 — Misi di Pasar Ceria (soal 125 + 135)
    {
      type: 'comic',
      chapter: 'Misi di Pasar Ceria',
      image: 'gambar/hal-4.jpeg',
      hint: 'Ibu penjual buah minta tolong menghitung 125 + 135 apel. Ayo bantu!',
    },
    // 6 — Belajar Menjumlahkan (penjelasan 125+135=260)
    {
      type: 'comic',
      chapter: 'Belajar Menjumlahkan',
      image: 'gambar/hal-5.jpeg',
      hint: 'Pisahkan ratusan, puluhan, satuan: 125 + 135 = 260 apel! 🍎',
    },
    // 7 — QUIZ 1: Tantangan Penjumlahan 347 + 189 = ? (hal-6.jpeg)
    {
      type: 'hotspot-quiz',
      chapter: 'Tantangan Penjumlahan 1',
      image: 'gambar/hal-6.jpeg',
      hint: '👉 Tekan langsung kotak jawaban (A, B, atau C) di dalam gambar papan tulis!',
      quizId: 'q1-penjumlahan',
      hotspots: [
        {
          id: 'q1-a',
          label: 'A. 536',
          left: 43.17,
          top: 31.51,
          width: 19.48,
          height: 12.5,
          isCorrect: true,
          explain: 'Jawaban Benar! 347 + 189 = 536! Hebat sekali! 🎉',
          wrongExplain: '',
        },
        {
          id: 'q1-b',
          label: 'B. 526',
          left: 43.31,
          top: 47.4,
          width: 19.33,
          height: 12.76,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Coba perhatikan langkah penjumlahan bersusun ya:\n\n1. Jumlahkan Satuan:\n   7 + 9 = 16 (tulis angka 6 pada satuan, dan simpan 1 puluhan di atas).\n\n2. Jumlahkan Puluhan:\n   4 + 8 + 1 (simpanan) = 13 (tulis angka 3 pada puluhan, simpan 1 ratusan di atas).\n\n3. Jumlahkan Ratusan:\n   3 + 1 + 1 (simpanan) = ?\n\nGabungkan ratusan, puluhan, dan satuan. Coba hitung lagi dan pilih kembali ya!',
        },
        {
          id: 'q1-c',
          label: 'C. 436',
          left: 43.02,
          top: 63.93,
          width: 19.48,
          height: 12.76,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Perhatikan angka ratusannya dengan teliti ya:\n\n1. Satuan: 7 + 9 = 16 (tulis 6, simpan 1 ke puluhan).\n2. Puluhan: 4 + 8 + 1 (simpanan) = 13 (tulis 3, simpan 1 ke ratusan).\n3. Ratusan: 3 + 1 ditambah 1 simpanan, hasilnya tentu lebih dari 4!\n\nAyo hitung kembali ratusannya dan tentukan jawabanmu!',
        },
      ],
    },
    // 8 — QUIZ 2: Challenge Problem 43 + 28 = ? (hal-7.jpeg)
    {
      type: 'hotspot-quiz',
      chapter: 'Tantangan Penjumlahan 2',
      image: 'gambar/hal-7.jpeg',
      hint: '👉 Tekan langsung kotak jawaban (A, B, C, atau D) di dalam gambar papan!',
      quizId: 'q2-penjumlahan',
      hotspots: [
        {
          id: 'q2-a',
          label: 'A. 61',
          left: 52.33,
          top: 42.97,
          width: 10.17,
          height: 16.93,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Hampir tepat! Jangan lupa tambahkan angka simpanannya ya:\n\n1. Satuan: 3 + 8 = 11 (tulis angka 1, lalu simpan 1 di atas puluhan).\n2. Puluhan: 4 + 2 = 6, lalu tambahkan 1 simpanan tadi: 6 + 1 = ?\n\nGabungkan hasilnya dan coba pilih lagi!',
        },
        {
          id: 'q2-b',
          label: 'B. 71',
          left: 62.5,
          top: 42.97,
          width: 9.3,
          height: 16.93,
          isCorrect: true,
          explain: 'Jawaban Benar! 43 + 28 = 71! Luar biasa! 🎉',
          wrongExplain: '',
        },
        {
          id: 'q2-c',
          label: 'C. 72',
          left: 52.33,
          top: 60.55,
          width: 10.17,
          height: 17.45,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Coba perhatikan penjumlahan satuannya:\n\n3 + 8 hasilnya adalah 11, bukan 12.\nJadi angka satuan di belakang haruslah 1.\n\nCoba periksa lagi pilihan jawabanmu!',
        },
        {
          id: 'q2-d',
          label: 'D. 81',
          left: 62.5,
          top: 60.55,
          width: 10.17,
          height: 17.45,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Penjumlahan puluhannya sedikit berlebih nih:\n\n1. Satuan: 3 + 8 = 11 (simpan 1 ke puluhan).\n2. Puluhan: 4 + 2 + 1 simpanan = 7, bukan 8!\n\nAyo hitung kembali dengan cermat!',
        },
      ],
    },
    // 9 — Toko Alat Tulis (transisi cerita)
    {
      type: 'comic',
      chapter: 'Toko Alat Tulis',
      image: 'gambar/hal-8.jpeg',
      hint: 'Bima dan Lala pergi ke Toko Alat Tulis Pelajar Pandai!',
    },
    // 10 — Tantangan Perkalian (4 kelompok × 3 penggaris)
    {
      type: 'comic',
      chapter: 'Tantangan Perkalian',
      image: 'gambar/hal-9.jpeg',
      hint: 'Ada 4 kelompok penggaris, masing-masing berisi 3. Bagaimana menghitungnya?',
    },
    // 11 — Belajar Perkalian (penjelasan 4×3=12)
    {
      type: 'comic',
      chapter: 'Belajar Perkalian',
      image: 'gambar/hal-10.jpeg',
      hint: 'Perkalian = penjumlahan berulang! 3+3+3+3 = 4×3 = 12! 📐',
    },
    // 12 — QUIZ 3: Dua Tantangan Perkalian (hal-11.jpeg)
    {
      type: 'hotspot-quiz',
      chapter: 'Tantangan Perkalian',
      image: 'gambar/hal-11.jpeg',
      hint: '👉 Tekan kotak jawaban di papan kiri (7×9) dan papan kanan (6×8)!',
      groups: [
        {
          quizId: 'q3-perkalian-1',
          name: '7 × 9',
          hotspots: [
            {
              id: 'q3-1a',
              label: 'A. 63',
              left: 34.0,
              top: 39.8,
              width: 7.5,
              height: 8.0,
              isCorrect: true,
              explain: 'Benar sekali! 7 × 9 = 63! Mantap! 🌟',
              wrongExplain: '',
            },
            {
              id: 'q3-1b',
              label: 'B. 72',
              left: 42.3,
              top: 39.8,
              width: 7.5,
              height: 8.0,
              isCorrect: false,
              explain: '',
              wrongExplain: 'Angka 72 adalah hasil dari 8 × 9.\nSoal ini menanyakan 7 × 9 (ada 7 kelompok angka 9):\n\nCara mudah: (7 × 10) dikurangi 7\n= 70 - 7 = ?\n\nAyo coba hitung pengurangannya dan pilih kembali!',
            },
            {
              id: 'q3-1c',
              label: 'C. 54',
              left: 34.0,
              top: 48.2,
              width: 7.5,
              height: 8.0,
              isCorrect: false,
              explain: '',
              wrongExplain: 'Angka 54 adalah hasil dari 6 × 9.\nKarena ini 7 × 9, kamu tinggal menambahkan 9 lagi dari 54:\n\n54 + 9 = ?\n\nCoba hitung penjumlahan tersebut!',
            },
            {
              id: 'q3-1d',
              label: 'D. 81',
              left: 42.3,
              top: 48.2,
              width: 7.5,
              height: 8.0,
              isCorrect: false,
              explain: '',
              wrongExplain: 'Angka 81 adalah hasil dari 9 × 9.\nUntuk menghitung 7 × 9, kamu bisa menghitung secara berulang:\n9 + 9 = 18\n18 + 9 = 27\n27 + 9 = 36\n36 + 9 = 45\n45 + 9 = 54\n54 + 9 = ?\n\nCari tahu hasil akhirnya!',
            },
          ],
        },
        {
          quizId: 'q3-perkalian-2',
          name: '6 × 8',
          hotspots: [
            {
              id: 'q3-2a',
              label: 'A. 42',
              left: 56.2,
              top: 39.8,
              width: 7.5,
              height: 8.0,
              isCorrect: false,
              explain: '',
              wrongExplain: 'Angka 42 adalah hasil dari 6 × 7.\nKarena soal ini 6 × 8, tambahkan satu kali angka 6 lagi ke 42:\n\n42 + 6 = ?\n\nCoba hitung dan pilih lagi!',
            },
            {
              id: 'q3-2b',
              label: 'B. 48',
              left: 64.5,
              top: 39.8,
              width: 7.5,
              height: 8.0,
              isCorrect: true,
              explain: 'Luar biasa! 6 × 8 = 48! Tepat sekali! 🌟',
              wrongExplain: '',
            },
            {
              id: 'q3-2c',
              label: 'C. 36',
              left: 56.2,
              top: 48.2,
              width: 7.5,
              height: 8.0,
              isCorrect: false,
              explain: '',
              wrongExplain: 'Angka 36 adalah hasil dari 6 × 6.\nUntuk 6 × 8, ada dua kelompok 6 lagi yang perlu ditambahkan:\n\n36 + 12 = ?\n\nAtau jumlahkan: 8 + 8 + 8 + 8 + 8 + 8 = ?\nAyo coba lagi!',
            },
            {
              id: 'q3-2d',
              label: 'D. 54',
              left: 64.5,
              top: 48.2,
              width: 7.5,
              height: 8.0,
              isCorrect: false,
              explain: '',
              wrongExplain: 'Angka 54 adalah hasil dari 6 × 9 (kelebihan 1 kelompok).\nUntuk mencari 6 × 8, kamu cukup kurangi 6 dari 54:\n\n54 - 6 = ?\n\nAyo hitung kembali!',
            },
          ],
        },
      ],
    },
    // 13 — Ayo Waktunya Latihan (transisi)
    {
      type: 'comic',
      chapter: 'Waktunya Latihan',
      image: 'gambar/hal-12.jpeg',
      hint: 'Ayo, waktunya latihan! Siap selesaikan tantangan akhir di papan kelas! 📝',
    },
    // 14 — QUIZ 4: Tantangan Matematika Kelas 4 (hal-13.jpeg)
    {
      type: 'hotspot-board-quiz',
      chapter: 'Tantangan Matematika Kelas 4',
      image: 'gambar/hal-13.jpeg',
      hint: '👉 Tekan kotak angka berwarna di bawah papan untuk mengisi jawaban soal di papan tulis!',
      boardBoxes: [
        { quizId: 'q4-p1', label: '37', left: 45.78, top: 27.34, width: 5.09, height: 7.94 },
        { quizId: 'q4-p2', label: '84', left: 45.78, top: 35.16, width: 5.09, height: 7.16 },
        { quizId: 'q4-m1', label: '42', left: 61.77, top: 27.34, width: 4.65, height: 7.94 },
        { quizId: 'q4-m2', label: '36', left: 61.77, top: 35.16, width: 4.72, height: 7.16 },
      ],
      chips: [
        // Baris 1 (Kotak Jawaban Benar)
        {
          id: 'chip-37',
          quizId: 'q4-p1',
          label: '37 (23 + 14)',
          left: 38.66,
          top: 46.61,
          width: 5.96,
          height: 5.21,
          isCorrect: true,
          explain: 'Tepat sekali! 23 + 14 = 37! Kotak kosong di papan sudah terisi! 🎉',
          wrongExplain: '',
        },
        {
          id: 'chip-42',
          quizId: 'q4-m1',
          label: '42 (6 × 7)',
          left: 45.64,
          top: 46.61,
          width: 5.96,
          height: 5.21,
          isCorrect: true,
          explain: 'Benar! 6 × 7 = 42! Soal perkalian pertama terselesaikan! 🎉',
          wrongExplain: '',
        },
        {
          id: 'chip-84',
          quizId: 'q4-p2',
          label: '84 (56 + 28)',
          left: 52.54,
          top: 46.61,
          width: 5.96,
          height: 5.21,
          isCorrect: true,
          explain: 'Hebat! 56 + 28 = 84! Kotak penjumlahan kedua berhasil! 🎉',
          wrongExplain: '',
        },
        {
          id: 'chip-36',
          quizId: 'q4-m2',
          label: '36 (4 × 9)',
          left: 59.45,
          top: 46.61,
          width: 5.96,
          height: 5.21,
          isCorrect: true,
          explain: 'Luar biasa! 4 × 9 = 36! Semua soal di papan sukses diselesaikan! 🌟',
          wrongExplain: '',
        },
        // Baris 2 (Kotak Pengecoh / Distraktor)
        {
          id: 'chip-78',
          quizId: null,
          label: '78',
          left: 37.79,
          top: 53.65,
          width: 6.83,
          height: 7.55,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Angka 78 bukan jawaban dari soal-soal di papan ini.\n\nCoba kita cek soal 23 + 14:\n1. Satuan: 3 + 4 = 7.\n2. Puluhan: 2 + 1 = 3.\n\nJadi hasilnya berkepala 3, bukan kepala 7 ya! Cari kotak yang angkanya sesuai!',
        },
        {
          id: 'chip-27',
          quizId: null,
          label: '27',
          left: 45.64,
          top: 53.65,
          width: 5.96,
          height: 5.21,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Angka 27 belum tepat.\n\nUntuk perkalian 6 × 7, artinya angka 7 dijumlahkan sebanyak 6 kali:\n7 + 7 = 14\n14 + 7 = 21\n21 + 7 = 28\n28 + 7 = 35\n35 + 7 = ?\n\nHasilnya lebih besar dari 40 lho! Coba cari kotak warna hijau!',
        },
        {
          id: 'chip-54',
          quizId: null,
          label: '54',
          left: 52.54,
          top: 53.65,
          width: 5.96,
          height: 5.21,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Angka 54 belum tepat untuk soal di papan ini.\n\nCoba hitung penjumlahan 56 + 28:\n1. Satuan: 6 + 8 = 14 (tulis angka 4, simpan 1 di puluhan).\n2. Puluhan: 5 + 2 + 1 (simpanan) = 8.\n\nJadi hasilnya berkepala 8 dan berakhiran 4. Coba temukan kotaknya!',
        },
        {
          id: 'chip-63',
          quizId: null,
          label: '63',
          left: 59.45,
          top: 53.65,
          width: 6.54,
          height: 7.55,
          isCorrect: false,
          explain: '',
          wrongExplain: 'Angka 63 adalah hasil dari 7 × 9.\nSedangkan soal di papan sebelah kanan adalah 4 × 9:\n\nHitung penjumlahan angka 9 sebanyak 4 kali:\n9 + 9 = 18\n18 + 9 = 27\n27 + 9 = ?\n\nAyo hitung kembali dan temukan kotaknya di baris atas!',
        },
      ],
    },
    // 15 — Penutup & Rekap Nilai (hal-14.jpeg)
    {
      type: 'final',
      chapter: 'Penutup & Rekap Nilai',
      image: 'gambar/hal-14.jpeg',
      hint: '🎉 Kamu telah menyelesaikan petualangan literasi & numerasi Bima dan Lala!',
    },
  ];

  // ========== APPLICATION STATE ==========
  let currentSlide = 0;
  let quizAnswers = {}; // { quizId: { selectedId, isCorrect } }
  let toastTimer = null;

  // DOM Elements
  const appEl = document.getElementById('app');
  const splashEl = document.getElementById('splash');
  const sheetsEl = document.getElementById('fbSheets');
  const stackEl = document.getElementById('fbStack');
  const castEl = document.getElementById('fbCast');
  const pageChapterEl = document.getElementById('pageChapter');
  const pageCounterBadgeEl = document.getElementById('pageCounterBadge');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const hintTextEl = document.getElementById('hintText');
  const progressLabelEl = document.getElementById('progressLabel');
  const progressFillEl = document.getElementById('progressFill');
  const thumbnailStripEl = document.getElementById('thumbnailStrip');
  const musicBtn = document.getElementById('musicBtn');
  const musicIcon = document.getElementById('musicIcon');
  const soundBtn = document.getElementById('soundBtn');
  const soundIcon = document.getElementById('soundIcon');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const bgmAudio = document.getElementById('bgmAudio');
  const toastNotificationEl = document.getElementById('toastNotification');
  const toastIconEl = document.getElementById('toastIcon');
  const toastTitleEl = document.getElementById('toastTitle');
  const toastMsgEl = document.getElementById('toastMsg');
  const explanationOverlay = document.getElementById('explanationOverlay');
  const explanationText = document.getElementById('explanationText');
  const explanationClose = document.getElementById('explanationClose');
  const explanationCloseIcon = document.getElementById('explanationCloseIcon');

  // Total Quizzes in this book:
  // Quiz 1 (hal-6: 347+189): 1
  // Quiz 2 (hal-7: 43+28): 1
  // Quiz 3 (hal-11: 7×9 & 6×8): 2
  // Quiz 4 (hal-13: 23+14, 56+28, 6×7, 4×9): 4
  // Total = 8 questions
  const TOTAL_QUIZZES = 8;

  function countCorrectQuizzes() {
    return Object.values(quizAnswers).filter((a) => a.isCorrect).length;
  }

  // ========== TOAST FEEDBACK ==========
  function showToast(title, msg, isSuccess = true) {
    if (toastTimer) clearTimeout(toastTimer);

    toastIconEl.textContent = isSuccess ? '🎉' : '💡';
    toastTitleEl.textContent = title;
    toastMsgEl.textContent = msg;

    toastNotificationEl.className = `toast-notification ${isSuccess ? 'success' : 'wrong'}`;
    toastNotificationEl.classList.remove('hidden');

    toastTimer = setTimeout(() => {
      toastNotificationEl.classList.add('hidden');
    }, 3500);
  }

  // ========== EXPLANATION OVERLAY (GUIDANCE ON WRONG ANSWER) ==========
  function showExplanation(text) {
    if (!explanationOverlay || !explanationText) return;
    explanationText.textContent = text;
    explanationOverlay.classList.remove('hidden');
    explanationOverlay.style.display = 'flex';
    void explanationOverlay.offsetWidth;
    explanationOverlay.classList.add('visible');
  }

  function hideExplanation() {
    if (!explanationOverlay) return;
    explanationOverlay.classList.remove('visible');
    setTimeout(() => {
      if (!explanationOverlay.classList.contains('visible')) {
        explanationOverlay.classList.add('hidden');
        explanationOverlay.style.display = 'none';
      }
    }, 280);
  }

  if (explanationClose) {
    explanationClose.addEventListener('click', hideExplanation);
  }
  if (explanationCloseIcon) {
    explanationCloseIcon.addEventListener('click', hideExplanation);
  }
  if (explanationOverlay) {
    explanationOverlay.addEventListener('click', function (e) {
      if (e.target === explanationOverlay) hideExplanation();
    });
  }

  // ========== FLIPBOOK ENGINE (3D PAGE TURN + DRAG) ==========
  const N = slides.length;
  const PERSP = 2600;
  let leaves = [];
  let angles = [];
  let flipping = false;
  let pending = null; // { lead, fwd, from, target }
  let rafId = null;

  function slideHtml(slide) {
    switch (slide.type) {
      case 'cover':
      case 'comic':
        return renderComicSlide(slide);
      case 'hotspot-quiz':
        return renderHotspotQuizSlide(slide);
      case 'hotspot-board-quiz':
        return renderHotspotBoardSlide(slide);
      case 'final':
        return renderFinalSlide(slide);
      default:
        return '';
    }
  }

  function renderLeaf(i) {
    const vp = leaves[i] && leaves[i].querySelector('.page-viewport');
    if (vp) vp.innerHTML = slideHtml(slides[i]);
  }

  function buildBook() {
    let html = '';
    slides.forEach((s, i) => {
      html += `
        <div class="leaf" data-i="${i}" style="--img:url('${s.image}')">
          <div class="face front"><div class="page-viewport"></div><div class="face-shade"></div></div>
          <div class="face back"><div class="face-shade"></div></div>
        </div>`;
    });
    sheetsEl.insertAdjacentHTML('beforeend', html);
    leaves = Array.from(sheetsEl.querySelectorAll('.leaf'));
    leaves.forEach((_, i) => renderLeaf(i));
    setState(currentSlide);
    updateMeta();
  }

  // a: 0 = page lying on the right, -180 = fully turned over to the left
  function setAngle(i, a) {
    const lf = leaves[i];
    if (!lf) return;
    angles[i] = a;
    const p = -a / 180;
    lf.style.transform = a === 0 ? 'none' : `perspective(${PERSP}px) rotateY(${a}deg)`;
    lf.style.visibility = p >= 0.995 ? 'hidden' : 'visible';
    lf.style.setProperty('--s', Math.sin(p * Math.PI).toFixed(3));
    lf.style.setProperty('--o', p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.3).toFixed(3) : '1');
  }

  function setCast(a) {
    const p = -a / 180;
    const c = Math.cos(p * Math.PI);
    castEl.style.left = Math.max(0, c) * 100 + '%';
    castEl.style.opacity = c > 0 ? (Math.sin(p * Math.PI) * 0.9).toFixed(3) : '0';
  }

  function setState(cur) {
    for (let i = 0; i < N; i++) {
      setAngle(i, i < cur ? -180 : 0);
      leaves[i].style.zIndex = i < cur ? i : N - i;
      leaves[i].style.display = Math.abs(i - cur) <= 2 ? '' : 'none';
      leaves[i].classList.remove('flying');
    }
    castEl.style.opacity = '0';
  }

  // Arrange the stack so that the moving leaf reveals exactly the target page
  function prepare(target) {
    const from = currentSlide;
    const fwd = target > from;
    const lead = fwd ? from : target;
    const other = fwd ? target : from;
    if (slides[target].type === 'final') renderLeaf(target);
    for (let i = 0; i < N; i++) {
      const unflipped = i === lead || i >= other;
      setAngle(i, unflipped ? 0 : -180);
      leaves[i].style.zIndex = unflipped ? N - i : i;
      leaves[i].style.display = i === lead || i === other || i === other + 1 ? '' : 'none';
    }
    setAngle(lead, fwd ? 0 : -180);
    leaves[lead].style.zIndex = 1000;
    leaves[lead].classList.add('flying');
    flipping = true;
    pending = { lead, fwd, from, target };
    return pending;
  }

  function finish(target) {
    const prev = currentSlide;
    currentSlide = target;
    setState(target);
    pending = null;
    flipping = false;
    updateMeta();
    if (target !== prev && slides[target].type === 'final') playVictorySound();
  }

  function tween(from, to, dur, step, done, easeOut) {
    cancelAnimationFrame(rafId);
    const t0 = performance.now();
    const ease = easeOut
      ? (t) => 1 - Math.pow(1 - t, 3)
      : (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      step(from + (to - from) * ease(t));
      if (t < 1) rafId = requestAnimationFrame(frame);
      else done();
    })(t0);
  }

  function flipTo(target) {
    if (flipping || target === currentSlide || target < 0 || target >= N) return;
    const { lead, fwd } = prepare(target);
    playPageFlipSound();
    tween(fwd ? 0 : -180, fwd ? -180 : 0, 950, (a) => { setAngle(lead, a); setCast(a); }, () => finish(target));
  }

  function updateMeta() {
    const slide = slides[currentSlide];
    pageChapterEl.textContent = slide.chapter;
    pageCounterBadgeEl.textContent = `Hal. ${currentSlide + 1} / ${N}`;
    hintTextEl.textContent = slide.hint || 'Gunakan panah di samping untuk membalik halaman.';
    progressLabelEl.textContent = `Halaman ${currentSlide + 1} dari ${N}`;
    progressFillEl.style.width = `${((currentSlide + 1) / N) * 100}%`;
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === N - 1;
    // the stack of unread pages gets thinner as you read
    stackEl.style.setProperty('--t', (1.5 + 7 * (N - 1 - currentSlide) / (N - 1)).toFixed(2) + 'px');
    updateThumbnails();
  }

  // ----- Drag / swipe to turn the page -----
  let drag = null;
  let justDragged = false;

  sheetsEl.addEventListener('pointerdown', (e) => {
    if (flipping || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = {
      id: e.pointerId, x: e.clientX, y: e.clientY, active: false, fwd: true,
      w: sheetsEl.getBoundingClientRect().width, p: 0, lastP: 0, lastT: performance.now(), v: 0,
    };
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
      const fwd = dx < 0;
      if ((fwd && currentSlide >= N - 1) || (!fwd && currentSlide <= 0)) { drag = null; return; }
      drag.active = true;
      drag.fwd = fwd;
      prepare(fwd ? currentSlide + 1 : currentSlide - 1);
      try { sheetsEl.setPointerCapture(e.pointerId); } catch (_) {}
    }
    const raw = (drag.fwd ? -dx : dx) / (drag.w * 0.75);
    const p = Math.min(1, Math.max(0, raw));
    const now = performance.now();
    if (now - drag.lastT > 16) {
      drag.v = (p - drag.lastP) / (now - drag.lastT);
      drag.lastP = p;
      drag.lastT = now;
    }
    drag.p = p;
    const a = drag.fwd ? -180 * p : -180 * (1 - p);
    setAngle(pending.lead, a);
    setCast(a);
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.active || !pending) return;
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 80);
    const { lead, fwd, target } = pending;
    const complete = d.p > 0.35 || (d.v > 0.0015 && d.p > 0.08);
    const endA = complete ? (fwd ? -180 : 0) : (fwd ? 0 : -180);
    const startA = angles[lead];
    if (complete) playPageFlipSound();
    tween(startA, endA, 160 + 420 * (Math.abs(endA - startA) / 180),
      (a) => { setAngle(lead, a); setCast(a); },
      () => finish(complete ? target : currentSlide), true);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // a drag must never count as a click on an answer hotspot
  sheetsEl.addEventListener('click', (e) => {
    if (justDragged) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // ========== TEMPLATES ==========

  // 1. Comic Picture Template
  function renderComicSlide(slide) {
    return `
      <div class="comic-slide-wrap">
        <img class="comic-picture" loading="lazy" decoding="async" draggable="false" src="${slide.image}" alt="${escapeHtml(slide.chapter)}">
      </div>
    `;
  }

  // 2. Hotspot Quiz (Hal 7 & Hal 8 & Hal 12)
  function renderHotspotQuizSlide(slide) {
    let hotspotsHtml = '';

    if (slide.hotspots) {
      // Single question (Hal 7: 347+189, Hal 8: 43+28)
      const state = quizAnswers[slide.quizId];
      slide.hotspots.forEach((h) => {
        let cls = 'hotspot box';
        let disabled = false;
        if (state && state.isCorrect) {
          cls += ' answered';
          if (h.isCorrect) cls += ' correct';
          disabled = true;
        }
        hotspotsHtml += `
          <button class="${cls}"
            data-id="${h.id}"
            style="left:${h.left}%; top:${h.top}%; width:${h.width}%; height:${h.height}%;"
            onclick="window.onHotspotSelect('${h.id}')"
            title="${h.label || 'Pilih jawaban ini'}"
            aria-label="${h.label || 'Opsi'}"
            ${disabled ? 'disabled' : ''}>
          </button>
        `;
      });
    } else if (slide.groups) {
      // Multiple question groups on one slide (Hal 12: 7×9 and 6×8)
      slide.groups.forEach((g) => {
        const state = quizAnswers[g.quizId];
        g.hotspots.forEach((h) => {
          let cls = 'hotspot box';
          let disabled = false;
          if (state && state.isCorrect) {
            cls += ' answered';
            if (h.isCorrect) cls += ' correct';
            disabled = true;
          }
          hotspotsHtml += `
            <button class="${cls}"
              data-id="${h.id}"
              style="left:${h.left}%; top:${h.top}%; width:${h.width}%; height:${h.height}%;"
              onclick="window.onHotspotSelect('${h.id}')"
              title="${h.label || 'Pilih jawaban ini'}"
              aria-label="${h.label || 'Opsi'}"
              ${disabled ? 'disabled' : ''}>
            </button>
          `;
        });
      });
    }

    return `
      <div class="comic-slide-wrap">
        <img class="comic-picture" loading="lazy" decoding="async" draggable="false" src="${slide.image}" alt="${escapeHtml(slide.chapter)}">
        <div class="hotspot-overlay-layer">
          ${hotspotsHtml}
        </div>
      </div>
    `;
  }

  // 3. Hotspot Board Slide (Hal 14: Tantangan Matematika Kelas 4)
  function renderHotspotBoardSlide(slide) {
    let hotspotsHtml = '';

    // Render Answer Badges inside the chalkboard empty boxes when solved!
    if (slide.boardBoxes) {
      slide.boardBoxes.forEach((b) => {
        const state = quizAnswers[b.quizId];
        if (state && state.isCorrect) {
          hotspotsHtml += `
            <div class="board-filled-badge"
              style="left:${b.left}%; top:${b.top}%; width:${b.width}%; height:${b.height}%;"
              title="Jawaban: ${b.label}">
              <span>${b.label}</span>
            </div>
          `;
        }
      });
    }

    // Render 8 colored answer chips
    if (slide.chips) {
      slide.chips.forEach((c) => {
        let cls = 'hotspot box';
        let disabled = false;
        if (c.quizId && quizAnswers[c.quizId] && quizAnswers[c.quizId].isCorrect) {
          cls += ' answered correct';
          disabled = true;
        }
        hotspotsHtml += `
          <button class="${cls}"
            data-id="${c.id}"
            style="left:${c.left}%; top:${c.top}%; width:${c.width}%; height:${c.height}%;"
            onclick="window.onHotspotSelect('${c.id}')"
            title="${c.label || 'Pilih kotak ini'}"
            aria-label="${c.label || 'Opsi'}"
            ${disabled ? 'disabled' : ''}>
          </button>
        `;
      });
    }

    return `
      <div class="comic-slide-wrap">
        <img class="comic-picture" loading="lazy" decoding="async" draggable="false" src="${slide.image}" alt="${escapeHtml(slide.chapter)}">
        <div class="hotspot-overlay-layer">
          ${hotspotsHtml}
        </div>
      </div>
    `;
  }

  // 4. Final Slide (Hal 15: Rekap Skor & Penutup)
  let isScoreVisible = true;
  function renderFinalSlide(slide) {
    const correctCount = countCorrectQuizzes();
    const scorePct = Math.round((correctCount / TOTAL_QUIZZES) * 100);

    let praise = 'Semangat Terus Berlatih!';
    let emoji = '💪';
    if (correctCount === TOTAL_QUIZZES) {
      praise = 'Luar Biasa Sempurna!';
      emoji = '🌟🌟🌟';
    } else if (correctCount >= 6) {
      praise = 'Sangat Pintar & Teliti!';
      emoji = '⭐⭐';
    } else if (correctCount >= 4) {
      praise = 'Hebat Sekali!';
      emoji = '⭐';
    }

    return `
      <div class="comic-slide-wrap final-slide-wrap">
        <img class="comic-picture" loading="lazy" decoding="async" draggable="false" src="${slide.image}" alt="Selamat Tinggal">
        <!-- Floating score card positioned at top sky area so bottom banner is 100% visible -->
        <div class="final-score-overlay ${isScoreVisible ? '' : 'minimized'}" id="finalScoreCard">
          <div class="final-score-text">
            <h3>🏆 ${praise} ${emoji}</h3>
            <p>Kamu berhasil menjawab <b>${correctCount} dari ${TOTAL_QUIZZES}</b> soal tantangan berhitung dengan benar!</p>
            <p class="score-percent">Nilai Literasi & Numerasi: <b>${scorePct} / 100</b></p>
          </div>
          <div class="final-score-badge">
            <div class="score-num-box">
              <strong>${correctCount}/${TOTAL_QUIZZES}</strong>
              <small>Benar</small>
            </div>
            <button class="btn-retry" onclick="window.resetAllQuizzes()" title="Ulangi Kuis">
              🔄 Ulangi Kuis
            </button>
            <button class="btn-toggle-score" onclick="window.toggleFinalScore()" title="Sembunyikan kartu nilai">
              ▲ Sembunyikan
            </button>
          </div>
        </div>
        <!-- Re-open button if minimized -->
        <button class="btn-show-score ${isScoreVisible ? 'hidden' : ''}" id="btnShowScore" onclick="window.toggleFinalScore()">
          🏆 Rekap Nilai
        </button>
      </div>
    `;
  }

  window.toggleFinalScore = function () {
    isScoreVisible = !isScoreVisible;
    const card = document.getElementById('finalScoreCard');
    const showBtn = document.getElementById('btnShowScore');
    if (card) card.classList.toggle('minimized', !isScoreVisible);
    if (showBtn) showBtn.classList.toggle('hidden', isScoreVisible);
  };

  // ========== HOTSPOT CLICK HANDLER & SELECTION ==========
  function findHotspotData(hotspotId) {
    const slide = slides[currentSlide];
    if (!slide) return null;

    if (slide.hotspots) {
      const h = slide.hotspots.find((x) => x.id === hotspotId);
      if (h) return { quizId: slide.quizId, ...h };
    }
    if (slide.groups) {
      for (const g of slide.groups) {
        const h = g.hotspots.find((x) => x.id === hotspotId);
        if (h) return { quizId: g.quizId, ...h };
      }
    }
    if (slide.chips) {
      const h = slide.chips.find((x) => x.id === hotspotId);
      if (h) return { quizId: h.quizId || 'distractor', ...h };
    }
    return null;
  }

  window.onHotspotSelect = function (hotspotId) {
    const data = findHotspotData(hotspotId);
    if (!data) return;

    const quizId = data.quizId;

    // If already correctly answered, notify
    if (quizId !== 'distractor' && quizAnswers[quizId] && quizAnswers[quizId].isCorrect) {
      showToast('Sudah Benar!', 'Soal ini sudah berhasil kamu selesaikan! ✅', true);
      return;
    }

    if (data.isCorrect) {
      // Correct!
      if (quizId && quizId !== 'distractor') {
        quizAnswers[quizId] = {
          selectedId: hotspotId,
          isCorrect: true,
        };
      }
      playCorrectSound();
      showToast('🎉 Benar Sekali!', data.explain || 'Jawabanmu sangat tepat! Hebat!', true);
      renderLeaf(currentSlide);
    } else {
      // WRONG ANSWER!
      playWrongSound();

      // Show temporary red border wobble on the clicked button
      const clickedBtn = document.querySelector(`[data-id="${hotspotId}"]`);
      if (clickedBtn) {
        clickedBtn.classList.remove('wrong');
        void clickedBtn.offsetWidth; // re-trigger animation
        clickedBtn.classList.add('wrong');
        setTimeout(() => {
          clickedBtn.classList.remove('wrong');
        }, 1200);
      }

      // Show step-by-step guidance notification modal WITHOUT revealing answer
      const explanation = data.wrongExplain || 'Coba perhatikan langkah-langkah pengerjaannya ya!';
      showExplanation(explanation);

      // Also trigger a toast notification
      showToast('💡 Belum Tepat', 'Yuk simak petunjuk cara pengerjaannya di layar!', false);
    }
  };

  // Backward-compatibility alias
  window.handleHotspotClick = function (quizId, hotspotId) {
    window.onHotspotSelect(hotspotId);
  };

  // Reset Quizzes
  window.resetAllQuizzes = function () {
    quizAnswers = {};
    slides.forEach((sl, i) => { if (sl.type !== 'cover' && sl.type !== 'comic') renderLeaf(i); });
    showToast('Kuis Direset', 'Ayo coba selesaikan semua tantangan lagi! 🚀', true);
    goToSlide(6); // Jump to first quiz slide (Hal 7)
  };

  // ========== NAVIGATION ==========
  function goToSlide(targetIndex) {
    flipTo(targetIndex);
  }

  window.goToSlide = goToSlide;

  prevBtn.addEventListener('click', () => {
    if (currentSlide > 0) goToSlide(currentSlide - 1);
  });

  nextBtn.addEventListener('click', () => {
    if (currentSlide < slides.length - 1) goToSlide(currentSlide + 1);
  });

  // Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      if (currentSlide < slides.length - 1) goToSlide(currentSlide + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (currentSlide > 0) goToSlide(currentSlide - 1);
    } else if (e.key === 'Escape') {
      hideExplanation();
    }
  });

  // ========== THUMBNAILS ==========
  function buildThumbnails() {
    let html = '';
    slides.forEach((s, idx) => {
      const hasQuiz = s.type.includes('quiz');
      html += `
        <button class="thumb-item ${idx === 0 ? 'active' : ''} ${hasQuiz ? 'has-quiz' : ''}"
          onclick="window.goToSlide(${idx})"
          title="${escapeHtml(s.chapter)} (Hal. ${idx + 1})"
          aria-label="Halaman ${idx + 1}">
          ${idx + 1}
        </button>
      `;
    });
    thumbnailStripEl.innerHTML = html;
  }

  function updateThumbnails() {
    const thumbs = thumbnailStripEl.querySelectorAll('.thumb-item');
    thumbs.forEach((t, i) => {
      t.classList.toggle('active', i === currentSlide);
    });
  }

  // ========== TOOLBAR BUTTONS ==========
  // Music Toggle
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      isMusicEnabled = !isMusicEnabled;
      if (musicIcon) musicIcon.textContent = isMusicEnabled ? '🎵' : '🔇';
      const label = musicBtn.querySelector('.tool-label');
      if (label) label.textContent = isMusicEnabled ? 'Musik' : 'Mati';
      musicBtn.classList.toggle('muted', !isMusicEnabled);

      if (isMusicEnabled) {
        initAudio();
        startBgm();
        showToast('🎵 Musik Aktif', 'Musik latar ceria sedang diputar.', true);
      } else {
        pauseBgm();
        showToast('🔇 Musik Dimatikan', 'Musik latar dinonaktifkan.', false);
      }
    });
  }

  // Sound Toggle
  soundBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    soundIcon.textContent = isSoundEnabled ? '🔊' : '🔇';
    const label = soundBtn.querySelector('.tool-label');
    if (label) label.textContent = isSoundEnabled ? 'Efek' : 'Mati';
    soundBtn.classList.toggle('muted', !isSoundEnabled);
    if (isSoundEnabled) {
      initAudio();
      playTone(523.25, 0.15);
    }
  });

  // Fullscreen Toggle
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error enabling fullscreen:', err);
      });
      fullscreenBtn.querySelector('.tool-label').textContent = 'Kecilkan';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        fullscreenBtn.querySelector('.tool-label').textContent = 'Layar Penuh';
      }
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    fullscreenBtn.querySelector('.tool-label').textContent = isFs ? 'Kecilkan' : 'Layar Penuh';
  });

  // ========== ESCAPING UTILS ==========
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  }

  function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // ========== INITIALIZATION ==========
  function unlockAudioOnInteraction() {
    initAudio();
    if (isMusicEnabled) {
      startBgm();
    }
  }

  document.addEventListener('click', unlockAudioOnInteraction, { once: true });
  document.addEventListener('keydown', unlockAudioOnInteraction, { once: true });
  document.addEventListener('touchstart', unlockAudioOnInteraction, { once: true });

  function init() {
    buildThumbnails();
    buildBook();
    checkCustomAudio();

    // Hide Splash after 1.8 seconds
    setTimeout(() => {
      splashEl.classList.add('hide');
      appEl.classList.remove('hidden');
      setTimeout(() => {
        splashEl.style.display = 'none';
        if (isMusicEnabled && audioCtx && audioCtx.state === 'running') {
          startBgm();
        }
      }, 600);
    }, 1800);
  }

  init();
})();
