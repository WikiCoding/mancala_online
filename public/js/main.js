const socket = io();

const gameTable = document.querySelector('.game-table');
const p1TextInput = document.querySelector('.p1input');
const p2TextInput = document.querySelector('.p2input');
const playersElements = document.querySelectorAll('.container');
const gameNotesText = document.getElementById('game-notes');
const gameOverTextWinner = document.getElementById('game-notes-modal-winner');
const gameOverTextLoser = document.getElementById('game-notes-modal-loser');
const modal = document.getElementById("myModal");
const countdownElement = document.getElementById("countdown");
const endGameBtn = document.getElementById("endGame");

socket.on('gameState', (data) => {
  //console.log(data);
  const updateUI = () => {
    for (let i = 1; i < 7; i++) {
      playersElements[0].children[i].innerHTML = data.tableData[i - 1].seeds;
      playersElements[1].children[i].innerHTML = data.tableData[i + 5].seeds;
    }

    p1TextInput.value = data.p1Score;
    p2TextInput.value = data.p2Score;

    gameNotesText.value = data.message;
  }

  updateUI();

  const lockOppositePlayerPits = (playerOneIsPlaying) => {
    if (playerOneIsPlaying) {
      for (let i = 1; i < 7; i++) {
        playersElements[0].children[i].removeAttribute('disabled');
      }
      for (let i = 1; i < 7; i++) {
        playersElements[1].children[i].setAttribute('disabled', '');
      }
    } else {
      for (let i = 1; i < 7; i++) {
        playersElements[1].children[i].removeAttribute('disabled');
      }
      for (let i = 1; i < 7; i++) {
        playersElements[0].children[i].setAttribute('disabled', '');
      }
    }
  }

  lockOppositePlayerPits(data.playerOneIsPlaying);

  // const lockOppositePlayerPits = () => {
  //   if (data.connectedSockets.length === 1) {
  //     for (let i = 1; i < 7; i++) {
  //       playersElements[0].children[i].removeAttribute('disabled');
  //     }
  //     for (let i = 1; i < 7; i++) {
  //       playersElements[1].children[i].setAttribute('disabled', '');
  //     }
  //   } else if (data.connectedSockets.length === 2) {
  //     for (let i = 1; i < 7; i++) {
  //       playersElements[1].children[i].removeAttribute('disabled');
  //     }
  //     for (let i = 1; i < 7; i++) {
  //       playersElements[0].children[i].setAttribute('disabled', '');
  //     }
  //   } else {
  //     for (let i = 1; i < 7; i++) {
  //       playersElements[0].children[i].setAttribute('disabled', '');
  //     }
  //     for (let i = 1; i < 7; i++) {
  //       playersElements[1].children[i].setAttribute('disabled', '');
  //     }
  //   }
  // }

  // lockOppositePlayerPits();
});

const getClick = (e) => {
  const selectedPitId = parseInt(e.target.id.split('n')[1]);
  socket.emit('playerSelection', selectedPitId)
}

gameTable.addEventListener('click', getClick);

endGameBtn.addEventListener('click', () => {
  socket.emit('reset');
})

socket.on('refresh', () => {
  window.location.reload();
})

socket.on('played', data => {

  const updateUI = () => {
    for (let i = 1; i < 7; i++) {
      playersElements[0].children[i].innerHTML = data.tableData[i - 1].seeds;
      playersElements[1].children[i].innerHTML = data.tableData[i + 5].seeds;
    }

    p1TextInput.value = data.p1Score;
    p2TextInput.value = data.p2Score;

    const lockOppositePlayerPits = (playerOneIsPlaying) => {
      if (playerOneIsPlaying) {
        for (let i = 1; i < 7; i++) {
          playersElements[0].children[i].removeAttribute('disabled');
        }
        for (let i = 1; i < 7; i++) {
          playersElements[1].children[i].setAttribute('disabled', '');
        }
      } else {
        for (let i = 1; i < 7; i++) {
          playersElements[1].children[i].removeAttribute('disabled');
        }
        for (let i = 1; i < 7; i++) {
          playersElements[0].children[i].setAttribute('disabled', '');
        }
      }
    }

    lockOppositePlayerPits(data.playerOneIsPlaying);

    // const lockOppositePlayerPits = () => {
    //   console.log(data.connectedSockets);
    //   if (data.connectedSockets.length === 1) {
    //     for (let i = 1; i < 7; i++) {
    //       playersElements[0].children[i].removeAttribute('disabled');
    //     }
    //     for (let i = 1; i < 7; i++) {
    //       playersElements[1].children[i].setAttribute('disabled', '');
    //     }
    //   } else if (data.connectedSockets.length === 2) {
    //     for (let i = 1; i < 7; i++) {
    //       playersElements[1].children[i].removeAttribute('disabled');
    //     }
    //     for (let i = 1; i < 7; i++) {
    //       playersElements[0].children[i].setAttribute('disabled', '');
    //     }
    //   } else {
    //     for (let i = 1; i < 7; i++) {
    //       playersElements[0].children[i].setAttribute('disabled', '');
    //     }
    //     for (let i = 1; i < 7; i++) {
    //       playersElements[1].children[i].setAttribute('disabled', '');
    //     }
    //   }
    // }

    // lockOppositePlayerPits();

    gameNotesText.value = data.message;

    if (data.gameOver) {
      modal.style.display = "block";

      gameOverTextWinner.value = data.gameOverMessageWinner;
      gameOverTextLoser.value = data.gameOverMessageLoser;
      gameNotesText.value = data.message;

      const startCountdown = (duration) => {
        let timer = duration;
        countdownElement.innerHTML = timer;

        const interval = setInterval(function () {
          timer--;
          countdownElement.innerHTML = timer;

          if (timer <= 0) {
            clearInterval(interval);
            countdownElement.innerHTML = "Countdown Finished, Restarting!";
          }
        }, 1000);
      }

      startCountdown(5);

      setTimeout(() => {
        window.location.reload();
      }, 5000);
    }
  }

  updateUI();

})

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}