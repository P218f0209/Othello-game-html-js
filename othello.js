document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded 発火");

  const canvas = document.getElementById("gameCanvas");
  canvas.width = 480;
  canvas.height = 480;

  const ctx = canvas.getContext("2d");
  const status = document.getElementById("status");

  
  
    
  


    document.getElementById("submit-name").addEventListener("click", () => {
        const input = document.getElementById("username-input");
        if (input.value.trim()) {
          player_name = input.value.trim();

          if (!localStorage.getItem("user_id")) {
              user_id = generateUUID();
              localStorage.setItem("user_id", user_id);
          } else {
              user_id = localStorage.getItem("user_id");
          }

          localStorage.setItem("player_name", player_name);
          document.getElementById("PlayerName").style.display = "none";
          StartScreen();
          }
        
      });

      
  
      function StartScreen() {
        document.getElementById("StartScreen").style.display = "block";
        document.getElementById("welcome-message").innerText = `${player_name} さん、ようこそ！`;
      
        
        document.getElementById("start-match").onclick = () => {
          document.getElementById("StartScreen").style.display = "none";
          Matching_Screen();
        };

        document.getElementById("start-cpu").onclick = () => {
          document.getElementById("StartScreen").style.display = "none";
          connect_server("cpu");  // mode: "cpu" を指定
          
        };
      
      
        document.getElementById("reset-user").onclick = () => {
          const confirmReset = confirm("ユーザー情報を初期化して名前入力に戻りますか？");
          if (confirmReset) {
            localStorage.removeItem("player_name");
            localStorage.removeItem("user_id");
            player_name = "";
            user_id = generateUUID();

            localStorage.setItem("user_id", user_id);
      
            document.getElementById("StartScreen").style.display = "none";
            document.getElementById("PlayerName").style.display = "block";
          }
        };
      }
  
      function Matching_Screen() {
        document.getElementById("Matching_Screen").style.display = "block";
        status.style.display = "block";
        status.innerText = "マッチング中...";
        connect_server();
      }
      document.getElementById("cancel-match").addEventListener("click", () => {
        if (websocket) websocket.close();
        document.getElementById("Matching_Screen").style.display = "none";
        document.getElementById("StartScreen").style.display = "block";
      });


      function ReadyScreen(opponent_name, color = null,reconnect_code = false) {
        if (color != null){
          your_color =color;
        }

        const vsTitle = document.getElementById("vs-title");
        const OPPONENT_NAME = document.getElementById("opponent-name");

        if (reconnect_code){
            vsTitle.innerText =  "対戦を再開します...";
            OPPONENT_NAME.innerText = `相手: ${opponent_name}`;
        } else {
            vsTitle.innerText = `${player_name} vs ${opponent_name}`;
            OPPONENT_NAME.innerText = `相手: ${opponent_name}`;
        }
        

      
        document.getElementById("ReadyScreen").style.display = "block";
      
        setTimeout(() => {
          document.getElementById("ReadyScreen").style.display = "none";
          
          GameScreen(your_color,reload);
          draw_board();
        }, 3000);
      }
      let skip = false;
      function GameScreen(color = null,reload = false) {
        if (skip){
          console.log("GameScreenの初期化をスキップ");
          return;
        }
        skip = true;

        console.log("GameScreen呼び出し時の引数 color:", color);
        if (color !=null){
          your_color = color;
        }
        if(!reload){
          console.log("🔵 盤面の初期化");
          init_board();
        }else{
          console.log("🟢 盤面の初期化はスキップ（再接続）");
        }
        
      
        document.getElementById("GameScreen").style.display = "block";
        
      
        canvas.removeEventListener("click", handle_canvas_click);
        canvas.removeEventListener("touchstart", handle_canvas_click);
      
        canvas.addEventListener("click", handle_canvas_click);
        canvas.addEventListener("touchstart", handle_canvas_click);
      }
        const surrenderButton = document.createElement("button");
        surrenderButton.id = "surrenderButton";
        surrenderButton.textContent = "降参";
        surrenderButton.style.marginTop = "10px";
        surrenderButton.style.display = "block";
        surrenderButton.onclick = () => {
            const confirmSurrender = confirm("本当に降参しますか？");
            if (confirmSurrender) {
                websocket.send(JSON.stringify({
                  type: "surrender",
                  user_id: user_id,
                }));
                // 自分は先にスタート画面へ
                board = Array.from({ length: BOARD_SIZE }, () =>
                  Array(BOARD_SIZE).fill(0)
                );
                init_board(board);
                game_started = false;
                skip = false;
                reload = false;
                document.getElementById("GameScreen").style.display = "none";
                
                StartScreen();
              }
            };
        document.getElementById("GameScreen").appendChild(surrenderButton);
        
      function update_turn_state() {
        your_turn = (your_color === current_player);
        click_locked = !your_turn;
        status.innerText = your_turn ? "あなたのターンです" : "相手のターンです";
      }
      function connect_server(mode = "online") {
        websocket = new WebSocket("wss://othello-server-pkzn.onrender.com/ws");
  
        status.style.display = "block";
        status.innerText = "マッチング中...";
  
        websocket.onopen = () => {
          status.innerText = "接続成功";

          const Id = localStorage.getItem("user_id");
          const Name = localStorage.getItem("player_name");
        
          if (Id && Name) {
            console.log("register送信:", Id, Name);
            websocket.send(JSON.stringify({
              type: "register",
              user_id: Id,
              name: Name,
              mode: mode  // "online" または "cpu"
            }));
          } else {
            console.warn("初回接続なのに名前やIDが設定されていません。PlayerName画面で処理されるべきです。");
          }
        };

          
        let game_started = false;
        websocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
        
          
          if (data.type === "start_game") {
            if(game_started){
              console.log("🟢 start_gameはすでに受信済み（重複防止）");
              return;
            }
            game_started = true;

          
            current_player = data.first_turn === "black" ? 1 : -1;
            if (your_color === null) {
              your_color = (data.your_color === "black") ? 1 : -1;
              console.log("your_color 設定:", your_color);
            } else {
              console.warn("your_color はすでに設定済み（上書き防止）:", your_color, "←無視された値:", data.your_color);
            }
            update_turn_state();
            

            console.log("start_game:", data.first_turn, data.your_color);
            console.log("初期設定: current_player =", current_player, "your_color =", your_color);
          
            // 3. 画面遷移
            document.getElementById("Matching_Screen").style.display = "none";
            const opponent_name = data.opponent_name ?? "相手不明";
            ReadyScreen(opponent_name, your_color, false);

          
          } else if (data.type === "restore_board") {
            console.log("🟡 restore_board を受信しました");
            console.log("board:", data.board);
            console.log("current_player:", data.current_player);
            console.log("your_color:", data.your_color);
        
            board = data.board;
            current_player = (data.current_player === "black") ? 1 : -1;
        
            if (your_color === null || your_color === undefined) {
              if (data.your_color === "black") {
                  your_color = 1;
              } else if (data.your_color === "white") {
                  your_color = -1;
              } else if (typeof data.your_color === "number") {
                  your_color = data.your_color;
              } else {
                  console.warn("不正な your_color:", data.your_color);
              }
          } else {
              console.log("your_color はすでに設定済み（上書き防止）:", your_color, "←無視された値:", data.your_color);
          }

            console.log("代入後 board 内容:", board.map(row => row.join(" ")).join("\n"));
        
            update_turn_state();
            
            // 必要に応じてステータス表示
            

            document.getElementById("Matching_Screen").style.display = "none";
            

            console.log("代入後 board:", board);
            console.log("代入後 your_color:", your_color);

            reload = true;

            const opponentName = data.opponent_name ?? "";
            ReadyScreen(opponentName, your_color, true);

          }else if (data.type === "update_board") {
              console.log("🔄 相手の再接続により盤面を更新");
              board = data.board;
              

              update_turn_state();
              draw_board();
          
        
          } else if (data.type === "move") {
            const x = data.x;
            const y = data.y;
            const color = data.color === "black" ? 1 : -1;
          
            console.log("move受信: x =", x, "y =", y, "color =", color);
          
            // 自分で石を置いて反転
            place_stone(x, y, color);  // ← 反転処理付きの関数（既にあるはず）
          
            current_player = data.next_turn === "black" ? 1 : -1;
            update_turn_state();
          
            draw_board();  // 再描画
          
            
          
        
          } else if (data.type === "pass") {
            console.log("相手がパスしました");
            const pass_text = document.getElementById("pass_text");
            if (pass_text) {
              pass_text.innerText = "相手がパスしました";
              pass_text.style.display = "block";
              setTimeout(() => {
                pass_text.style.display = "none";
              }, 1500);
            }
        
            current_player = data.next_turn === "black" ? 1 : -1;
            update_turn_state();
            draw_board();
        
            if (current_player === your_color && !has_valid_move(your_color)) {
              websocket.send(JSON.stringify({ type: "pass" }));
            } else {
              
              canvas.removeEventListener("click", handle_canvas_click);
              canvas.removeEventListener("touchstart", handle_canvas_click);
              canvas.addEventListener("click", handle_canvas_click);
              canvas.addEventListener("touchstart", handle_canvas_click);
            
            } 
          } else if (data.type === "opponent_surrendered") {
              alert("相手が降参しました。あなたの勝ちです。");
              document.getElementById("GameScreen").style.display = "none";
              
              board = Array.from({ length: BOARD_SIZE }, () =>
                Array(BOARD_SIZE).fill(0)
              );
              init_board(board);
              
              
              game_started = false;
              skip = false;
              reload = false;
              StartScreen();
            
            
        
          } else if (data.type === "end_game") {
               console.log("end_game受信");

               if(reconnect_timer){
                 clearTimeout(reconnect_timer);
                 reconnect_timer = null;
               }
        
               board = data.board;
               current_player = (data.current_player === "black") ? 1 : -1;
               your_color = data.your_color === "black" ? 1 : -1;
        
               your_turn = false;  // ゲーム終了時なので false
        
               draw_board();  // 最終盤面を表示
               who_winner();  // 勝者を表示
            
        

          }else if (data.type === "opponent_disconnected") {
            console.log("相手が切断されました。30秒待機開始");

            if(reconnect_timer){
              clearTimeout(reconnect_timer);
              reconnect_timer=null;
            }
            reconect_state = "waiting";
          
            const pass_text = document.getElementById("pass_text");
            if (pass_text) {
              pass_text.innerText = "相手が切断されました。30秒以内に再接続されなければ終了します。";
              pass_text.style.display = "block";

              setTimeout(() =>{
                pass_text.style.display = "none";
              },1500);
            }
          
            reconnect_timer = setTimeout(() => {
              if(reconect_state === "waiting"){
                reconect_state = "timeout";
                console.log("相手が再接続しなかったためゲームを終了し、スタート画面に戻ります。");
                if(websocket)websocket.close();
          
                document.getElementById("GameScreen").style.display = "none";
                document.getElementById("StartScreen").style.display = "block";
                  
                const pass_text = document.getElementById("pass_text");
                if (pass_text) pass_text.style.display = "none";
              }
            }, 30000);
          }else if (data.type === "opponent_reconnected") {
            console.log("相手が再接続しました。待機タイマー解除");
          
            if (reconnect_timer) {
              clearTimeout(reconnect_timer);
              reconnect_timer = null;
            }
            reconect_state = "reconnected";
          
            const pass_text = document.getElementById("pass_text");
            if (pass_text) pass_text.style.display = "none";
          }
        };
  
        websocket.onerror = () => {
          status.style.display = "block";
          status.innerText = "エラーが発生しました";
        };
  
        websocket.onclose = () => {
          console.warn("❌ WebSocket切断:", event);

          status.style.display = "block";
          status.innerText = "接続が切断されました。3秒後に再接続します...";
          setTimeout(connect_server, 3000);
        };
      }

    const CELL_SIZE = 60;
    const BOARD_SIZE = 8;
    const OTHELLO_SIZE = CELL_SIZE * BOARD_SIZE;

    let websocket = null;
    let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    let your_color = null;
    let current_player = 1;
    let player_name = "";
    let user_id = generateUUID();
    let reconnect_timer = null;
    let reconect_state = "idle";
    let reload = false;
    
    let your_turn = false;
    let click_locked = false;

    function generateUUID() {
       
        if (window.crypto && window.crypto.randomUUID) {
          return crypto.randomUUID();
        } else {
          // 手動でUUIDを生成
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
      }

    function init_board() {
      const mid = BOARD_SIZE / 2;
      board[mid - 1][mid - 1] = -1;
      board[mid][mid] = -1;
      board[mid - 1][mid] = 1;
      board[mid][mid - 1] = 1;
    }

    function draw_board() {
      console.log("draw_board時の値:",
        "current_player:", current_player,
        "your_color:", your_color,
        "一致判定:", current_player === your_color
      );
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);


        const show_hints = (current_player === your_color) && has_valid_move(your_color);
        const hint_move = show_hints ? turn_over(your_color): [];   
        console.log("ヒント候補:", hint_move);   
        for (let i = 0; i <= BOARD_SIZE; i++) {
          ctx.beginPath();
          ctx.moveTo(i * CELL_SIZE, 0);
          ctx.lineTo(i * CELL_SIZE, OTHELLO_SIZE);
          ctx.stroke();
      
          ctx.beginPath();
          ctx.moveTo(0, i * CELL_SIZE);
          ctx.lineTo(OTHELLO_SIZE, i * CELL_SIZE);
          ctx.stroke();
        }
      
        for (let x = 0; x < BOARD_SIZE; x++) {
          for (let y = 0; y < BOARD_SIZE; y++) {
            if (board[x][y] === 1) draw_stone(x, y, "black");
            else if (board[x][y] === -1) draw_stone(x, y, "white");
          }
        }
      
        if (show_hints ){  
            for (let [x, y] of hint_move) {
              ctx.beginPath();
              ctx.fillStyle = "yellow";
              ctx.arc(y * CELL_SIZE + CELL_SIZE / 2, x * CELL_SIZE + CELL_SIZE / 2, 6, 0, 2 * Math.PI);
              
              ctx.fill();
            
            
          }
        }
      
        draw_score_bar();
      }

    function draw_stone(x, y, color) {
      
      ctx.beginPath();
      ctx.arc(y * CELL_SIZE + CELL_SIZE / 2, x * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 5, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }

    function draw_score_bar() {
      const black = board.flat().filter(c => c === 1).length;
      const white = board.flat().filter(c => c === -1).length;

      ctx.fillStyle = "#ddd";
      ctx.fillRect(0, OTHELLO_SIZE, canvas.width, 80);

      ctx.fillStyle = "black";
      ctx.font = "20px sans-serif";
      ctx.fillText(`Black: ${black}`, 50, OTHELLO_SIZE + 40);
      ctx.fillStyle = "white";
      ctx.fillText(`White: ${white}`, 350, OTHELLO_SIZE + 40);
    }

    

    

    function handle_canvas_click(e) {
      console.log("handle_canvas_click発火", { your_turn, click_locked });
        if (e.cancelable && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
      
        const rect = canvas.getBoundingClientRect();
      
        // ← ここでスケール補正を計算する
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
      
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
        const x = Math.floor((clientY - rect.top) * scaleY / CELL_SIZE);
        const y = Math.floor((clientX - rect.left) * scaleX / CELL_SIZE);
      
        if (board[x] && board[x][y] === 0 && current_player === your_color && valid_move(x, y, your_color)) {
          if (!place_stone(x, y, your_color)) return;
          current_player= -your_color;
          your_turn = false;
          draw_board();
      
          websocket.send(JSON.stringify({
            type: "move",
            x,
            y,
            user_id: user_id,
          }));
        }
      }

      function valid_move(x, y, color) {
        
        if (board[x][y] !== 0) return false;
      
        const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
        for (const [dx, dy] of dirs) {
          let nx = x + dx;
          let ny = y + dy;
          let found_opponent = false;
      
          while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            if (board[nx][ny] === -color) {
              found_opponent = true;
            } else if (board[nx][ny] === color) {
              if (found_opponent) return true;
              else break;
            } else {
              break;
            }
            nx += dx;
            ny += dy;
          }
        }
      
        return false;
      }

    
      function has_valid_move(color) {
        const valid = board.some((row, x) =>
          row.some((_, y) => valid_move(x, y, color))
        );
        console.log("has_valid_move(", color, ") →", valid);
        return valid;
      }
    

      function place_stone(x, y, color) {
        board[x][y] = color;
        let flipped = false;
      
        const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],          [0, 1],
          [1, -1],  [1, 0], [1, 1]
        ];
      
        for (let [dx, dy] of directions) {
          let nx = x + dx;
          let ny = y + dy;
          let stones_to_flip = [];
      
          while (
            nx >= 0 && nx < 8 &&
            ny >= 0 && ny < 8 &&
            board[nx][ny] === -color
          ) {
            stones_to_flip.push([nx, ny]);
            nx += dx;
            ny += dy;
          }
      
          if (
            nx >= 0 && nx < 8 &&
            ny >= 0 && ny < 8 &&
            board[nx][ny] === color
          ) {
            for (let [fx, fy] of stones_to_flip) {
              board[fx][fy] = color;
            }
            if (stones_to_flip.length > 0) {
              flipped = true;
            }
          }
        }
      
        return flipped;
      }

    
    function turn_over(color) {
      const moves = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          if (valid_move(x, y, color)) {
            moves.push([x, y]);
          }
        }
      }
      return moves;
    }

    

    function who_winner() {
      const black = board.flat().filter(c => c === 1).length;
      const white = board.flat().filter(c => c === -1).length;
      let msg = black > white ? "黒の勝ち！" : white > black ? "白の勝ち！" : "引き分け！";

      const winner = document.getElementById("winner_text");
      winner.innerText = msg;
      winner.style.display = "block";

      const daleteButton = document.getElementById("backButton");
      if (daleteButton) {
        daleteButton.remove();
      }

      const backButton = document.createElement("button");
      backButton.id = "backButton";
      backButton.textContent = "スタート画面に戻る";
      backButton.style.marginTop = "10px";
      backButton.onclick = () => {
        document.getElementById("GameScreen").style.display = "none";
        document.getElementById("winner_text").style.display = "none";
        backButton.remove();
        StartScreen();
     };

     winner.appendChild(backButton);
   }
      

      
    
    
  
  // 最初の画面

    const saveName = localStorage.getItem("player_name" );
    const saveId = localStorage.getItem("user_id");

    if(saveName && saveId){
      player_name = saveName;
      user_id = saveId
      document.getElementById("PlayerName").style.display = "none";
      StartScreen();

    }else{
    const nameInput = document.getElementById("PlayerName");
    if (nameInput) {
      nameInput.style.display = "block";
      console.log("PlayerName 表示完了");
    } else {
      console.log("PlayerName 要素が見つかりませんでした");
    }
  }
});

  


    
  


    
