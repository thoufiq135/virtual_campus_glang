local nk=require("nakama")
local M={}
function M.match_init(context,params)
    local state={
        user={}
    }
    local tick_rate=10
    local label=params.label
    return state,tick_rate,label
end
function M.match_join_attempt(context,dispatcher,tick,state,presence,metadata)
    return state , true, ""
end
function M.match_join(context,dispatcher,tick,state,presences)
    for _,p in ipairs(presences) do
        nk.logger_info("user joined" .. p.username)
        state.user[p.user_id]= {
            username=p.username,
            x=0,
            y=0
        }
        for user_id, data in pairs(state.user) do
            if user_id~=p.user_id then
                dispatcher.broadcast_message(
                    3,
                    nk.json_encode({
                        userId=user_id,
                        username=data.username,
                        name = data.name,
    avatar = data.avatar,
                        x = data.x,
                        y = data.y
                    }),
                    {p}
                )
            end
        end
    end
    return state
end
function M.match_leave(context, dispatcher, tick, state, presences)
    for _, p in ipairs(presences) do
        nk.logger_info("User left: " .. p.username)

        state.users[p.user_id] = nil

        -- 🔥 Tell others to despawn this player
        dispatcher.broadcast_message(
            4, -- DESPAWN opcode
            nk.json_encode({
                userId = p.user_id
            })
        )
    end

    return state
end
function M.match_loop(context,dispatcher,tick,state,messages)
    for _, msg in ipairs(messages) do
        if msg.op_code==1 then
            local data=nk.json_decode(msg.data)
            local users=state.user[msg.sender.user_id]
            if users then
                users.x = data.x
                users.y = data.y
            end
            dispatcher.broadcast_message(
                1,
               nk.json_encode({
                 userId=msg.sender.user_id,
                 username=msg.sender.username,
                 name = data.name,
    avatar = data.avatar,
                        x=data.x,
                        y=data.y
               }),
               nil,
               nil,
               false
            )
        end
    end
    return state
end
function M.match_terminate(context, dispatcher, tick, state, grace_seconds)
    nk.logger_info("Match terminated")
    return state
end
function M.match_signal(context, dispatcher, tick, state, data)
    nk.logger_info("Match signal received: " .. data)
    return state, data
end
return M