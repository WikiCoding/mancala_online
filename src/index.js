const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const publicDirPath = path.join(__dirname, '../public');
const NUMBER_OF_SEEDS_EACH_PIT = 3

const app = express();
const server = http.createServer(app);
const io = socketio(server);

let connectedSockets = [];

// game state
let p1Score = 0;
let p2Score = 0;
let flagEmptyP1 = [];
let flagEmptyP2 = [];
let round = 0;
let gameOver = false;
let tableData = [];
let playsAgain = false;
let playerOneIsPlaying = true;
let previousIdPlayed = 0;
let message = '';
let gameOverMessageWinner = '';
let gameOverMessageLoser = '';

const createTable = () => {
  for (let i = 0; i < 12; i++) {
    const point = {
      id: i,
      seeds: NUMBER_OF_SEEDS_EACH_PIT
    };

    tableData.push(point);
  }

  for (let i = 0; i < 6; i++) {
    tableData[i].matcher = i + 6;
  }

  for (let i = 6; i < 12; i++) {
    tableData[i].matcher = i - 6;
  }

  message = 'Game table created! Player 1, starts playing!';
}

createTable();

const setPlayerTurn = (roundNumber) => {

  if (roundNumber % 2 === 1) {
    playerOneIsPlaying = false;
  } else {
    playerOneIsPlaying = true;
  }
}

const checkGameOver = () => {
  for (let i = 0; i < 6; i++) {
    if (tableData[i].seeds !== 0) {
      flagEmptyP1[i] = false
    } else {
      flagEmptyP1[i] = true
    }
  }

  for (let i = 0; i < 6; i++) {
    if (tableData[i + 6].seeds !== 0) {
      flagEmptyP2[i] = false
    } else {
      flagEmptyP2[i] = true
    }
  }

  const filteredFlagsP1 = flagEmptyP1.filter(flag => flag === false);
  const filteredFlagsP2 = flagEmptyP2.filter(flag => flag === false);

  if (filteredFlagsP1.length === 0 || filteredFlagsP2.length === 0) {
    gameOver = true
  }
}

const updatePlayer1Score = (points) => {
  p1Score += points;
  message = `Player 1 scored +${points} points. Player 2 turn.`;
}

const updatePlayer2Score = (points) => {
  p2Score += points;
  message = `Player 2 scored +${points} points. Player 1 turn.`;
}

const checkAndSetPlayerScores = (playerOneTurn, selectedPitId, seedsOnSelectedPit) => {
  if (playerOneTurn && (seedsOnSelectedPit > selectedPitId)) {
    updatePlayer1Score(1);
  }

  if (!playerOneTurn && (selectedPitId + seedsOnSelectedPit > 11)) {
    updatePlayer2Score(1);
  }
}

const checkAndSetSeedsToPits = (playerOneTurn, selectedPitId, seedsOnSelectedPit) => {
  try {

    if (playerOneTurn) {
      const seedsRest = seedsOnSelectedPit - (selectedPitId + 1);

      if (seedsRest >= 0 && seedsRest <= 6) {
        for (let i = 0; i < selectedPitId; i++) {
          tableData[i].seeds++;
        }

        for (let i = 0; i < seedsRest; i++) {
          tableData[i + 6].seeds++;
        }

        if (seedsRest === 0) {
          message = `Player 1 plays another round!`;
          round--;
        }
      } else if (seedsRest > 6) {
        if (seedsRest > 6) {
          const secondRest = seedsRest - 6;

          for (let i = 0; i < (seedsRest - secondRest); i++) {
            tableData[6 + i].seeds++;
          }
          for (let i = 0; i < secondRest; i++) {
            tableData[5 - i].seeds++;
          }
        } else {
          for (let i = 0; i < seedsRest; i++) {
            tableData[6 + i].seeds++;
          }
        }
      } else {
        const lastPostion = selectedPitId - seedsOnSelectedPit;

        if (tableData[lastPostion].seeds === 0) {
          for (let i = 0; i < (seedsOnSelectedPit - 1); i++) {
            selectedPitId--;
            tableData[selectedPitId].seeds++;
          }
        } else {
          for (let i = 0; i < seedsOnSelectedPit; i++) {
            selectedPitId--;
            tableData[selectedPitId].seeds++;
          }

          message = `Player 1 didn't score! Player 2 turn!`;
        }

        checkIfEndedInFrontOfEmptyPit(playerOneTurn, lastPostion);
      }
    } else {
      const seedsRest = (selectedPitId + seedsOnSelectedPit) - 12;

      if (seedsRest >= 0 && seedsRest <= 6) {
        for (let i = 0; i < (seedsOnSelectedPit - (seedsRest + 1)); i++) {
          tableData[i + (selectedPitId + 1)].seeds++;
        }

        for (let i = 0; i < seedsRest; i++) {
          tableData[5 - i].seeds++;
        }

        if (seedsRest === 0) {
          message = `Player 2 plays another round!`;
          round--;
        }
      } else if (seedsRest > 6) {
        if (seedsRest > 6) {
          const secondRest = seedsRest - 6;

          for (let i = 0; i < (seedsRest - secondRest); i++) {
            tableData[5 - i].seeds++;
          }
          for (let i = 0; i < secondRest; i++) {
            tableData[6 + i].seeds++;
          }
        } else {
          for (let i = 0; i < seedsRest; i++) {
            tableData[5 - i].seeds++;
          }
        }
      } else {
        let lastPostion = selectedPitId + seedsOnSelectedPit;
        if (tableData[lastPostion].seeds === 0) {
          for (let i = 0; i < (seedsOnSelectedPit - 1); i++) {
            selectedPitId++;
            tableData[selectedPitId].seeds++;
          }
        } else {
          for (let i = 0; i < seedsOnSelectedPit; i++) {
            selectedPitId++;
            tableData[selectedPitId].seeds++;
          }

          message = `Player 2 didn't score! Player 1 turn!`;
        }

        checkIfEndedInFrontOfEmptyPit(playerOneTurn, lastPostion);
      }
    }

    checkGameOver();
    if (gameOver) {
      if (p1Score > p2Score || p1Score < p2Score) {
        const win = (p1Score > p2Score) ? `Player 1 wins with ${p1Score} points.` : `Player 2 wins with ${p2Score} points.`
        const lost = (p1Score > p2Score) ? `Player 2 finished with ${p2Score} points.` : `Player 1 finished with ${p1Score} points.`
        message = `Game ended. ${win} ${lost}`;

        gameOverMessageWinner = win;
        gameOverMessageLoser = lost;
      } else {
        message = `Player 1 and Player 2 ended up tied!`;
      }
    }
  } catch (e) {
    message = 'Sorry, An unexpected error occoured, please restart the game!';
  }
}

const checkIfEndedInFrontOfEmptyPit = (playerOneTurn, endId) => {
  const matcherElementId = tableData[endId].matcher;
  let points = 0;

  if (tableData[endId].seeds === 0) {
    points = tableData[matcherElementId].seeds + 1;

    playerOneTurn ? updatePlayer1Score(points) : updatePlayer2Score(points);

    tableData[endId].seeds = 0;
    tableData[matcherElementId].seeds = 0;
  }
}

const generateGameOverMessages = () => {
  if (p1Score > p2Score || p1Score < p2Score) {
    const win = (p1Score > p2Score) ? `Player 1 wins with ${p1Score} points.` : `Player 2 wins with ${p2Score} points.`
    const lost = (p1Score > p2Score) ? `Player 2 finished with ${p2Score} points.` : `Player 1 finished with ${p1Score} points.`
    message = `Game ended. ${win} ${lost}`;

    gameOverMessageWinner = win;
    gameOverMessageLoser = lost;
  } else {
    gameOverMessageWinner = `Player 1 and Player 2 ended up tied!`
  }
}

const verifyActivePlayer = () => {

  if (playerOneIsPlaying) {
    const playerVisiblePits = 'players visible only';
    const allPitsLocked = 'waiting for the other player';
    io.to(connectedSockets[0]).emit('lockP1Pits', playerVisiblePits);
    io.to(connectedSockets[1]).emit('lockP2Pits', allPitsLocked);
  } else {
    const playerVisiblePits = 'players visible only';
    const allPitsLocked = 'waiting for the other player';
    io.to(connectedSockets[0]).emit('lockP1Pits', allPitsLocked);
    io.to(connectedSockets[1]).emit('lockP2Pits', playerVisiblePits);
  }
}

app.use(express.static(publicDirPath));

io.on('connection', (socket) => {
  console.log(`New WebSocket connection ${socket.id}`);

  connectedSockets.push(socket.id);

  if (connectedSockets.length > 2) {
    socket.emit('gameFull', 'full');
    connectedSockets = connectedSockets.filter(s => s !== socket.id);
    return
  }

  socket.emit('gameState', { tableData, p1Score, p2Score, flagEmptyP1, flagEmptyP2, round, gameOver, playsAgain, playerOneIsPlaying, previousIdPlayed, message, connectedSockets });

  verifyActivePlayer();

  socket.on('playerSelection', (clickedId) => {
    round++;
    const seedsOnSelectedPit = tableData[clickedId].seeds;
    tableData[clickedId].seeds = 0;
    checkAndSetPlayerScores(playerOneIsPlaying, clickedId, seedsOnSelectedPit);
    checkAndSetSeedsToPits(playerOneIsPlaying, clickedId, seedsOnSelectedPit);
    setPlayerTurn(round);

    gameOver ? generateGameOverMessages() : 'Continue';

    const dataAccessObject = {
      p1Score, p2Score, flagEmptyP1, flagEmptyP2, round, gameOver, tableData, playsAgain, playerOneIsPlaying, previousIdPlayed, message, gameOverMessageWinner, gameOverMessageLoser, connectedSockets
    }

    if (gameOver) {
      p1Score = 0;
      p2Score = 0;
      flagEmptyP1 = [];
      flagEmptyP2 = [];
      round = 0;
      gameOver = false;
      tableData = [];
      playsAgain = false;
      playerOneIsPlaying = true;
      previousIdPlayed = 0;
      message = 'Game table created! Player 1, starts playing!';
      gameOverMessageWinner = '';
      gameOverMessageLoser = '';

      const createTable = () => {
        for (let i = 0; i < 12; i++) {
          const point = {
            id: i,
            seeds: NUMBER_OF_SEEDS_EACH_PIT
          };

          tableData.push(point);
        }

        for (let i = 0; i < 6; i++) {
          tableData[i].matcher = i + 6;
        }

        for (let i = 6; i < 12; i++) {
          tableData[i].matcher = i - 6;
        }
      }

      createTable();
    }

    verifyActivePlayer();

    io.emit('played', dataAccessObject);
  })

  socket.on('reset', () => {
    p1Score = 0;
    p2Score = 0;
    flagEmptyP1 = [];
    flagEmptyP2 = [];
    round = 0;
    gameOver = false;
    tableData = [];
    playsAgain = false;
    playerOneIsPlaying = true;
    previousIdPlayed = 0;
    message = 'Game table created! Player 1, starts playing!';
    gameOverMessageWinner = '';
    gameOverMessageLoser = '';

    const createTable = () => {
      for (let i = 0; i < 12; i++) {
        const point = {
          id: i,
          seeds: NUMBER_OF_SEEDS_EACH_PIT
        };

        tableData.push(point);
      }

      for (let i = 0; i < 6; i++) {
        tableData[i].matcher = i + 6;
      }

      for (let i = 6; i < 12; i++) {
        tableData[i].matcher = i - 6;
      }
    }

    createTable();

    io.emit('refresh');
  })

  socket.on('disconnect', () => {
    console.log("A user disconnected!");

    connectedSockets = connectedSockets.filter(s => s !== socket.id);
  })
})

const port = process.env.PORT;

server.listen(port, () => {
  console.log(`Server started on port ${port}`);
})
