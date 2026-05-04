console.log("Fail õigesti ühendatud");

class Typer{
    constructor(){
        this.name = "";
        this.wordsInGame = 1;
        this.startingWordLength = 5;
        this.startTime = 0;
        this.endTime = 0;
        this.word = "Suvaline";
        this.words = [];
        this.availableLengths = [];
        this.typeWords = [];
        this.wordsTyped = 0;
        this.score = 0;
        this.wpm = 0;
        this.audioContext = null;
        this.results = [];

        this.loadFromFile();
        this.attachUi();
    }

    attachUi(){
        document.getElementById("openResults").addEventListener("click", () => this.toggleModal(true));
        document.getElementById("closeModal").addEventListener("click", () => this.toggleModal(false));
        document.getElementById("restartBtn").addEventListener("click", () => this.restartGame());
    }

    loadResults(){
        const resultDiv = document.getElementById("results");
        resultDiv.innerHTML = "";

        if(!this.results.length){
            const empty = document.createElement("div");
            empty.className = "result-card";
            empty.innerHTML = "<h3>Puuduvad tulemused</h3><p>Salvesta esimesed kiired sõnad.</p>";
            resultDiv.appendChild(empty);
            return;
        }

        for(let i=0; i < this.results.length; i++){
            const card = document.createElement("div");
            card.className = "result-card";
            card.innerHTML = `<h3>#${i+1} ${this.results[i].name || 'Anonüümne'}</h3>` +
                              `<p><strong>Aeg:</strong> ${this.results[i].time} s</p>` +
                              `<p><strong>WPM:</strong> ${this.results[i].wpm || '-'} </p>`;
            resultDiv.appendChild(card);
        }
    }

    //Tulemuste näitamine
    toggleModal(show){
        document.getElementById("resultsModal").style.display = show ? "flex" : "none";
        if(show){
            this.loadResults();
        }
    }

    //Sõnade laadimine sõnade listi
    async loadFromFile(){
        console.log("load from file sees");
        try{
            const responseFromFile = await fetch("lemmad2013.txt");
            const allWords = await responseFromFile.text();
            this.getWords(allWords);
        } catch(err){
            console.error("Sõnade laadimine ebaõnnestus:", err);
        }

        await this.loadResultsFromFile();
    }

    //Ühendus andmebaasiga
    async loadResultsFromFile(){
        try{
            const resultsResponse = await fetch("database.txt");
            const resultsText = await resultsResponse.text();
            let content = JSON.parse(resultsText).content;
            this.results = JSON.parse(content) || [];
        } catch(err){
            const stored = localStorage.getItem("score");
            this.results = stored ? JSON.parse(stored) : [];
        }

        this.loadResults();
    }

    //Sõnade töötlemine
    getWords(data){
        const dataFromFile = data.split("\n");
        this.separateWordsByLength(dataFromFile);
    }

    
    separateWordsByLength(words){
        for (let word of words){
            const trimmed = word.trim();
            const wordLength = trimmed.length;
            if(!wordLength){
                continue;
            }
            if(!this.words[wordLength]){
                this.words[wordLength] = []
            }
            this.words[wordLength].push(trimmed);
        }

        this.availableLengths = Object.keys(this.words)
            .map(Number)
            .sort((a, b) => a - b);

        console.log("Laetud sõnade pikkused:", this.availableLengths);
        this.askName();
    }

    askName(){
        document.getElementById("submitname").addEventListener('click', () => {
           this.name = document.getElementById("username").value.trim() || "Mängija";
           this.initAudio();
           this.startCountdown();
        })
    }

    initAudio(){
        if(!this.audioContext){
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    //https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
    //Helide kasutamine
    playTone(frequency, duration = 0.12, volume = 0.18){
        if(!this.audioContext){
            return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);
        gain.gain.value = volume;
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    //Taimeri käivitamine
    startCountdown(){
        document.getElementById("counter").style.display = "flex";
        document.querySelector("#name").style.display = "none";
        let i = 3;

        let countdown = setInterval(() => {
            document.getElementById("time").innerHTML = i-1;
            i--;
            if(i == 0){
                document.getElementById("counter").style.display = "none";
                this.playTone(520, 0.25, 0.28);
                this.startTyper();
                clearInterval(countdown);
            }
        }, 1000);
    }

    //mängu algus
    startTyper(){
        this.wordsTyped = 0;
        this.generateWords();
        this.updateInfo();
        document.querySelector("#info").style.display = "flex";
        document.querySelector("#wordContainer").style.display = "flex";
        document.querySelector(".actions").style.display = "flex";

        this.startTime = performance.now();
        
        this.keyListener = (e) => {
            if(!e.key || e.key.length !== 1){
                return;
            }
            this.shorteWord(e.key);
            console.log("keypress sees");
        }

        window.addEventListener("keypress", this.keyListener)
    }

    //sõna lühemaks tegemine, kui kirjutada õige täht
    //Stack Overflow: https://stackoverflow.com/search?q=typing+game+javascript
    //MDN String.slice(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice
    shorteWord(keypressed){
        if(this.word[0] === keypressed && this.word.length > 1 && this.typeWords.length > this.wordsTyped){
            this.word = this.word.slice(1);
            this.drawWord();
            this.playTone(420, 0.04, 0.08);
        } else if (this.word[0] === keypressed && this.word.length == 1 && this.wordsTyped <= this.typeWords.length-2){
            this.playTone(520, 0.06, 0.12);
            this.wordsTyped++;
            this.updateInfo();
            this.selectWord();
        } else if(this.word[0] === keypressed && this.word.length == 1 && this.typeWords.length-1 == this.wordsTyped){
            this.updateInfo();
            this.wordsTyped = 0;
            this.endGame();
        } else if(this.word[0] != keypressed){
            const wordEl = document.getElementById("word");
            wordEl.style.color = "#f87171";
            this.playTone(160, 0.14, 0.16);
            setTimeout(() => {
                wordEl.style.color = "#1b1c1c";
            }, 100)
        }
    }

    endGame(){
        this.endTime = performance.now();
        this.score = ((this.endTime - this.startTime) / 1000).toFixed(2);
        this.wpm = Math.round((this.wordsInGame / (this.score / 60)));
        document.getElementById("word").innerHTML = `Mäng läbi. Aeg: ${this.score} s, WPM: ${this.wpm}`;
        window.removeEventListener("keypress", this.keyListener);
        this.updateInfo();
        this.showSpeedImage();
        this.playTone(720, 0.22, 0.18);
        this.saveResult();
    }

    //Salvestab andmebaasi
    async saveResult(){
        let result = {
            name: this.name,
            time: this.score,
            wpm: this.wpm
        }

        this.results.push(result);
        this.results.sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        localStorage.setItem("score", JSON.stringify(this.results));

        if(this.results.findIndex(r => r === result) < 10){
            this.playTone(880, 0.1, 0.18);
        }

        try{
            await fetch("server.php", {
                method: "POST",
                headers: {"Content-Type" : "application/x-www-form-urlencoded"},
                body: "save=" + encodeURIComponent(JSON.stringify(this.results))
            });
        } catch(err){
            console.warn("Failed to sync tulemused:", err);
        } finally{
            this.loadResults();
        }
    }


    generateWords(){
        this.typeWords = [];

        if(!this.availableLengths.length){
            this.typeWords = Array(this.wordsInGame).fill("kiirus");
            this.selectWord();
            return;
        }

        for(let i=0; i<this.wordsInGame; i++){
            const randomLength = this.availableLengths[
                Math.floor(Math.random() * this.availableLengths.length)
            ];
            const wordList = this.words[randomLength] || [];
            const randomIndex = Math.floor(Math.random() * wordList.length);
            this.typeWords[i] = wordList[randomIndex] || "kiirus";
        }

        this.selectWord();
    }

    selectWord(){
        this.word = this.typeWords[this.wordsTyped];
        this.drawWord();
    }

    drawWord(){
        document.getElementById("word").innerHTML = this.word;
    }

    updateInfo(){
        document.getElementById("playerName").textContent = this.name;
        document.getElementById("wordcount").textContent = `Sõnu trükitud: ${this.wordsTyped}/${this.wordsInGame}`;
        document.getElementById("speedInfo").textContent = this.wpm ? `${this.wpm} WPM` : `Oota lõppu`;
        document.getElementById("progressBar").style.width = `${Math.round((this.wordsTyped / this.wordsInGame) * 100)}%`;
    }

    showSpeedImage(){
        const imageContainer = document.getElementById("resultImage");
        const speed = this.wpm;
        const badge = this.makeSpeedBadge(speed);
        document.getElementById("speedText").textContent = badge.text;
        imageContainer.innerHTML = `<img style="max-width: 200px" src="${badge.src}" alt="${badge.alt}">`;
    }

    makeSpeedBadge(speed){
        // Turtle-slow kiirus (aeglane): alla 20 WPM
        if(speed < 20){
            return {
                text: "Aeglane",
                src: "turtle-slow.jpg",
                alt: "Aeglane kilpkonn"
            };
        }
        // Cheetah-speed kiirus (kiire): 20+ WPM
        else {
            return {
                text: "Oled kiirus",
                src: "cheetah-speed.jpg",
                alt: "Kiire gepard"
            };
        }
    }

    restartGame(){
        window.removeEventListener("keypress", this.keyListener);
        this.wordsTyped = 0;
        this.score = 0;
        this.wpm = 0;
        this.word = "";
        document.querySelector("#name").style.display = "flex";
        document.getElementById("username").value = "";
        document.querySelector("#info").style.display = "none";
        document.querySelector("#wordContainer").style.display = "none";
        document.querySelector(".actions").style.display = "none";
        document.getElementById("resultImage").innerHTML = "";
        document.getElementById("word").textContent = "";
        document.getElementById("playerName").textContent = "-";
        document.getElementById("wordcount").textContent = "0/0";
        document.getElementById("speedInfo").textContent = "-";
        document.getElementById("progressBar").style.width = "0%";
    }
}

let typer = new Typer();
