'use client'

import { useState } from 'react'

export default function PasswordInput({
  name='password',
  placeholder='Password',
  minLength,
  required=true
}:{
  name?:string
  placeholder?:string
  minLength?:number
  required?:boolean
}){
  const [showPassword,setShowPassword]=
    useState(false)

  return (
    <div
      style={{
        position:'relative',
        width:'100%'
      }}
    >
      <input
        name={name}
        type={
          showPassword
            ? 'text'
            : 'password'
        }
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        style={{
          width:'100%',
          paddingRight:46,
          boxSizing:'border-box'
        }}
      />

      <button
        type="button"
        onClick={()=>
          setShowPassword(
            current=>!current
          )
        }
        aria-label={
          showPassword
            ? 'Hide password'
            : 'Show password'
        }
        title={
          showPassword
            ? 'Hide password'
            : 'Show password'
        }
        style={{
          position:'absolute',
          right:8,
          top:'50%',
          transform:'translateY(-50%)',
          border:'none',
          background:'transparent',
          padding:6,
          cursor:'pointer',
          fontSize:'1.15rem',
          lineHeight:1,
          display:'flex',
          alignItems:'center',
          justifyContent:'center'
        }}
      >
        {showPassword
          ? '🙈'
          : '👁️'}
      </button>
    </div>
  )
}