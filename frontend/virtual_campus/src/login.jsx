import React from 'react'
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from 'react-router-dom';
localStorage.removeItem("stackenzo_gsin_user_data")
const Login = () => {
    const navigator = useNavigate()

    const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setname] = useState("");
  const [tryError, setTryError] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");

  const avatars = [
    "https://api.dicebear.com/7.x/bottts/png?seed=1",
    "https://api.dicebear.com/7.x/bottts/png?seed=2",
    "https://api.dicebear.com/7.x/bottts/png?s+eed=3",
    "https://api.dicebear.com/7.x/bottts/png?seed=4",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
if(password.length<8){
  alert("password must be min of 8 letters")
  return
}
if(mode=="signup"&&name.length<5){
  alert("name must be min 5 letters")
}
//"https://api.gsin.online/createAccount"
    try {
      let url =
        mode === "signup"
          ? "https://api.gsin.online/createAccount"
          : "https://api.gsin.online/LoginAccount";
console.log(url)
const payload =
  mode === "signup"
    ? {
        email,
        password,
        avatar:   selectedAvatar|| "https://api.dicebear.com/7.x/bottts/svg?seed=4",
        name:name
      }
    : {
        email,
        password,
      
      };
      console.log(payload)
     

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log(data)

        return;
      }
      console.log("login token =",data.token)

      localStorage.setItem("stackenzo_token_data_gsin", data.token);

      // Save avatar after signup
      // if (mode === "signup" && selectedAvatar) {
      //   await fetch("http://localhost:7350/v2/account", {
      //     method: "PUT",
      //     headers: {
      //       Authorization: `Bearer ${data.token}`,
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       avatar_url: selectedAvatar,
      //     }),
      //   });
      // }

     if(mode==="login"){
navigator("/campus")
      }

    } catch (err) {
      console.log(err);
      setTryError("Server error");
      setTimeout(() => setTryError(""), 5000);
    }
  };

  const googleLogin = async (token) => {
    const res = await fetch(
      "http://13.236.5.43:7350/v2/account/authenticate/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert("Google login failed");
      return;
    }

    localStorage.setItem("nakama_token", data.token);

    alert("Google login success");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="bg-slate-950 p-10 rounded-xl shadow-2xl w-[350px]">
    
            <h2 className="text-white text-2xl font-bold text-center capitalize">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
    
            <p className="text-slate-400 text-center mb-6">Virtual Campus Access</p>
    
            <form onSubmit={handleSubmit} className="space-y-4">
    
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-md bg-slate-900 border border-slate-700 text-white"
              />
    
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-md bg-slate-900 border border-slate-700 text-white"
              />
    
              {mode === "signup" && (
               <>
               
              <input
                type="name"
                placeholder="Name"
                required
                value={name}
                onChange={(e) => setname(e.target.value)}
                className="w-full px-4 py-3 rounded-md bg-slate-900 border border-slate-700 text-white"
              />
                <div>
                  <p className="text-slate-400 text-sm mb-2">Choose Avatar</p>
    
                  <div className="grid grid-cols-4 gap-3">
                    {avatars.map((a) => (
                      <img
                        key={a}
                        src={a}
                        onClick={() => setSelectedAvatar(a)}
                        className={`w-14 h-14 rounded-full cursor-pointer border-2 ${
                          selectedAvatar === a
                            ? "border-sky-400"
                            : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
               </>
              )}
    
              <button
                type="submit"
                className="w-full py-3 bg-sky-400 rounded-md font-semibold"
              >
                {mode === "login" ? "Login" : "Create Account"}
              </button>
    
            </form>
    
            {mode === "login" && (
              <>
                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-slate-700"></div>
                  <span className="px-3 text-slate-500 text-sm">OR</span>
                  <div className="flex-1 h-px bg-slate-700"></div>
                </div>
    
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={(res) => googleLogin(res.credential)}
                    onError={() => alert("Google Login Failed")}
                  />
                </div>
              </>
            )}
    
            <div className="text-center mt-4 text-sm">
    
              {mode === "login" ? (
                <p
                  onClick={() => setMode("signup")}
                  className="text-slate-400 cursor-pointer hover:text-white"
                >
                  Create Account
                </p>
              ) : (
                <p
                  onClick={() => setMode("login")}
                  className="text-slate-400 cursor-pointer hover:text-white"
                >
                  Back to Login
                </p>
              )}
    
            </div>
    
            {tryError && (
              <p className="text-red-400 text-center mt-4">{tryError}</p>
            )}
    
          </div>
        </div>
  )
}

export default Login
