// Açılır menülerin çalışması için
var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight){
        content.style.maxHeight = null;
        } else {
        content.style.maxHeight = content.scrollHeight + "px";
        } 
    });
}



let url = `ws://${window.location.host}/ws/socket-server/`
const chatSocket = new WebSocket(url)

let onlineFriends = []
chatSocket.onmessage = function (e) {
    let data = JSON.parse(e.data);

    if(data.type === 'chat'){
        let messages = document.getElementById('messages');

        var button = $('<button/>',
        {
            class: 'mdc-button mdc-button--raised mdc-ripple-upgraded',
            type: 'button',
            click: async function () {   
                await openUserMedia();
                document.querySelector('#currentRoom').innerText = `Current room is ${data.roomid} - You are the callee!`;
                await joinRoomById(data.roomid);
                $(button).remove();
             },
        });
        
        button.appendTo(messages);
        button.html(`${data.caller} arıyor!<span class="material-icons">video_call</span>`);
          
    }

    if(data.type === 'user_status_change'){
        let messages = document.getElementById('messages')

        if(data.status == "online")
        {
            if(!onlineFriends.includes(data.username))
            {
                onlineFriends.push(data.username)
                let usernameToCall = data.username;
                var button = $('<button/>',
                {
                    class: 'transparent-button',
                    type: 'button',
                    click: async function () {   
                         await openUserMedia();
                         let roomid = await createRoom();
                         chatSocket.send(JSON.stringify({
                            'callTo': usernameToCall,
                            'roomid': roomid,
                          }));
                     },
                });
                button.html('<span class="material-icons">video_call</span>');
                button.appendTo("#online-friends").wrap(`<li id="${data.username}_friend_li">${data.username}</li>`);
            }
        }
        else if(data.status == "offline")
        {
            if(onlineFriends.includes(data.username))
            {
                onlineFriends.pop(data.username);
                $("#online-friends").find(`#${data.username}_friend_li`).remove();
            }
        }

        $("#online-count").html(onlineFriends.length);
    }
    else if(data.type === 'user_friends_info')
    {
        $("#all-count").html(data.friends.length);
        for (friend of data.friends)
        {
            console.log(friend.username);

            var button = $('<button/>',
            {
                class: 'transparent-button',
                type: 'button',
                click: function () {   alert(`Info of: ${friend.username}`);   },
            });
            button.html('<span class="material-icons">person</span>');
            button.appendTo("#all-friends").wrap(`<li id="${friend.username}_friend_li">${friend.username}</li>`);
        }
    }
}

//let form = document.getElementById('form')
//form.addEventListener('submit', (e)=>{
//    e.preventDefault()
//    console.log(e.target.message.value)
//    let message = e.target.message.value
//    chatSocket.send(JSON.stringify({
//        'message':message
//    }))
//    form.reset
//}); 

$(document).ready(function () {
    $.get("/get_friend_requests/", function(data, status){
        data = JSON.parse(data)
        
        for(key in data)
        {  
            let id=data[key].request_id;
            var button = $('<button/>',
            {
                class: 'transparent-button',
                type: 'button',
                click: function () {   
                    $.get(`/accept_friend_request/${id}`, function(data, status){
                        location.reload();
                    });
                },
            });
            button.html('<span class="material-icons">done</span>')
            button.appendTo("#friendship-requests").wrap(`<li>${data[key].username}</li>`);
        }

        $("#request-count").html(data.length);
    });

   
    $("[data-value]").on("click", function (e) {
        e.preventDefault()
        console.log($(this).attr("data-value"))
    });
  });

