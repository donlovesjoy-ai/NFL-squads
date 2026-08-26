'use client'

import {
  ChangeEvent,
  useState
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SquadLogo from './SquadLogo'

type Props={
  currentLogoPath?:string|null
  nflAbbreviation?:string|null
  squadName:string
}

const MAX_FILE_SIZE=
  2*1024*1024

const allowedTypes=
  new Map([
    ['image/png','png'],
    ['image/jpeg','jpg'],
    ['image/webp','webp']
  ])

export default function SquadLogoUploader({
  currentLogoPath,
  nflAbbreviation,
  squadName
}:Props){
  const router=useRouter()

  const [uploading,setUploading]=
    useState(false)

  const [message,setMessage]=
    useState('')

  const [error,setError]=
    useState('')

  async function uploadLogo(
    event:ChangeEvent<HTMLInputElement>
  ){
    setError('')
    setMessage('')

    const file=
      event.target.files?.[0]

    if(!file){
      return
    }

    const extension=
      allowedTypes.get(file.type)

    if(!extension){
      setError(
        'Please select a PNG, JPG, or WebP image.'
      )

      event.target.value=''
      return
    }

    if(file.size>MAX_FILE_SIZE){
      setError(
        'Logo must be 2 MB or smaller.'
      )

      event.target.value=''
      return
    }

    setUploading(true)

    const supabase=
      createClient()

    const {
      data:{user},
      error:userError
    }=
      await supabase.auth.getUser()

    if(userError || !user){
      setUploading(false)

      setError(
        'Your login session has expired.'
      )

      return
    }

    const filePath=
      `${user.id}/${crypto.randomUUID()}.${extension}`

    const {error:uploadError}=
      await supabase.storage
        .from('squad-logos')
        .upload(
          filePath,
          file,
          {
            contentType:file.type,
            cacheControl:'3600',
            upsert:false
          }
        )

    if(uploadError){
      setUploading(false)

      setError(
        uploadError.message ||
        'Unable to upload logo.'
      )

      return
    }

    const {error:updateError}=
      await supabase.rpc(
        'set_my_squad_logo',
        {
          p_season:2026,
          p_logo_path:filePath
        }
      )

    if(updateError){
      await supabase.storage
        .from('squad-logos')
        .remove([filePath])

      setUploading(false)

      setError(
        updateError.message ||
        'Unable to save logo.'
      )

      return
    }

    if(currentLogoPath){
      await supabase.storage
        .from('squad-logos')
        .remove([currentLogoPath])
    }

    setUploading(false)

    setMessage(
      'Team logo updated.'
    )

    event.target.value=''

    router.refresh()
  }

  async function restoreHelmet(){
    setError('')
    setMessage('')
    setUploading(true)

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
      setUploading(false)

      setError(
        error.message ||
        'Unable to restore NFL helmet.'
      )

      return
    }

    if(currentLogoPath){
      await supabase.storage
        .from('squad-logos')
        .remove([currentLogoPath])
    }

    setUploading(false)

    setMessage(
      'NFL helmet restored.'
    )

    router.refresh()
  }

  return (
    <div
      style={{
        marginTop:8,
        textAlign:'center'
      }}
    >
      <div
        style={{
          display:'flex',
          justifyContent:'center',
          marginBottom:8
        }}
      >
        <SquadLogo
          logoPath={currentLogoPath}
          nflAbbreviation={nflAbbreviation}
          squadName={squadName}
          size={143}
        />
      </div>

      <label
        className="submit"
        style={{
          display:'inline-block',
          cursor:
            uploading
              ? 'default'
              : 'pointer',
          fontSize:'0.82rem'
        }}
      >
        {uploading
          ? 'Updating...'
          : currentLogoPath
            ? 'Change Team Logo'
            : 'Upload Team Logo'}

        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={uploadLogo}
          disabled={uploading}
          style={{
            display:'none'
          }}
        />
      </label>

      {currentLogoPath && (
        <div
          style={{
            marginTop:9
          }}
        >
          <button
            type="button"
            onClick={restoreHelmet}
            disabled={uploading}
            style={{
              border:0,
              background:'transparent',
              textDecoration:'underline',
              cursor:
                uploading
                  ? 'default'
                  : 'pointer',
              fontSize:'0.76rem'
            }}
          >
            Restore NFL helmet
          </button>
        </div>
      )}

      <div
        className="muted"
        style={{
          marginTop:7,
          fontSize:'0.72rem'
        }}
      >
        PNG, JPG, or WebP · 2 MB maximum
      </div>

      {message && (
        <div
          style={{
            marginTop:7,
            fontSize:'0.78rem',
            fontWeight:700
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="status"
          style={{
            marginTop:7,
            fontSize:'0.78rem'
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
