'use client'

import {
  ChangeEvent,
  useRef,
  useState
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props={
  currentLogoPath?:string|null
}

const MAX_FILE_SIZE=
  4*1024*1024

const allowedTypes=
  new Map([
    ['image/png','png'],
    ['image/jpeg','jpg'],
    ['image/webp','webp']
  ])

export default function SquadLogoUploader({
  currentLogoPath
}:Props){
  const router=
    useRouter()

  const inputRef=
    useRef<HTMLInputElement|null>(
      null
    )

  const [working,setWorking]=
    useState(false)

  const [error,setError]=
    useState('')

  function chooseLogo(){
    if(working){
      return
    }

    inputRef.current?.click()
  }

  async function uploadLogo(
    event:
      ChangeEvent<HTMLInputElement>
  ){
    setError('')

    const file=
      event.target.files?.[0]

    if(!file){
      return
    }

    const extension=
      allowedTypes.get(
        file.type
      )

    if(!extension){
      setError(
        'Please select a PNG, JPG, or WebP image.'
      )

      event.target.value=''
      return
    }

    if(
      file.size>
      MAX_FILE_SIZE
    ){
      setError(
        'Logo must be 4 MB or smaller.'
      )

      event.target.value=''
      return
    }

    setWorking(true)

    const supabase=
      createClient()

    const {
      data:{
        user
      },
      error:userError
    }=
      await supabase.auth
        .getUser()

    if(
      userError ||
      !user
    ){
      setWorking(false)

      setError(
        'Your login session has expired.'
      )

      return
    }

    const filePath=
      `${user.id}/${crypto.randomUUID()}.${extension}`

    const {
      error:uploadError
    }=
      await supabase.storage
        .from(
          'squad-logos'
        )
        .upload(
          filePath,
          file,
          {
            contentType:
              file.type,
            cacheControl:
              '3600',
            upsert:false
          }
        )

    if(uploadError){
      setWorking(false)

      setError(
        uploadError.message ||
        'Unable to upload logo.'
      )

      return
    }

    const {
      error:updateError
    }=
      await supabase.rpc(
        'set_my_squad_logo',
        {
          p_season:2026,
          p_logo_path:
            filePath
        }
      )

    if(updateError){
      await supabase.storage
        .from(
          'squad-logos'
        )
        .remove([
          filePath
        ])

      setWorking(false)

      setError(
        updateError.message ||
        'Unable to save logo.'
      )

      return
    }

    setWorking(false)

    event.target.value=''

    router.refresh()
  }

  async function restoreHelmet(){
    if(working){
      return
    }

    setError('')
    setWorking(true)

    const supabase=
      createClient()

    const {error}=
      await supabase.rpc(
        'clear_my_squad_logo',
        {
          p_season:2026
        }
      )

    if(error){
      setWorking(false)

      setError(
        error.message ||
        'Unable to restore NFL helmet.'
      )

      return
    }

    if(currentLogoPath){
      await supabase.storage
        .from(
          'squad-logos'
        )
        .remove([
          currentLogoPath
        ])
    }

    setWorking(false)

    router.refresh()
  }

  return (
    <div
      style={{
        textAlign:'center',
        marginTop:4
      }}
    >
      {currentLogoPath ? (
        <button
          type="button"
          onClick={
            restoreHelmet
          }
          disabled={
            working
          }
          style={{
            border:0,
            padding:0,
            background:'transparent',
            textDecoration:'underline',
            cursor:
              working
                ? 'default'
                : 'pointer',
            fontSize:'0.76rem',
            fontFamily:'inherit',
            color:'inherit'
          }}
        >
          {working
            ? 'Restoring...'
            : 'Restore NFL Helmet'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={
              chooseLogo
            }
            disabled={
              working
            }
            style={{
              border:0,
              padding:0,
              background:'transparent',
              textDecoration:'underline',
              cursor:
                working
                  ? 'default'
                  : 'pointer',
              fontSize:'0.76rem',
              fontFamily:'inherit',
              color:'inherit'
            }}
          >
            {working
              ? 'Uploading...'
              : 'Change Team Logo'}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={
              uploadLogo
            }
            disabled={
              working
            }
            style={{
              display:'none'
            }}
          />
        </>
      )}

      {error && (
        <div
          className="status"
          style={{
            marginTop:5,
            fontSize:'0.72rem'
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}