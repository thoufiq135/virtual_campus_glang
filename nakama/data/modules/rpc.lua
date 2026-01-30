local nk =require("nakama")
local Room_Label="gsin_multiplayer"
local function create_join_match(context,payload)
    nk.logger_info("called create_join_match function")
    local matches=nk.match_list(
        1,
        true,
        Room_Label,
        nil,
        nil
    )
    if matches~=nil and #matches>0 then
        nk.logger_info("returning running match" .. matches[1].match_id)
        return nk.json_encode({
            match_id=matches[1].match_id
        })
    end
    local match_id=nk.match_create("match_init",{
        label=Room_Label
    })     
    nk.logger_info("match created" .. match_id)
    return nk.json_encode({
        match_id=match_id
    })
end
nk.register_rpc(create_join_match,"create_join_match")
