import React, { useEffect, useRef, useState } from 'react'

export default function ProctorCamera({ userId, examId }) {
  const videoRef = useRef(null)
  const intervalRef = useRef(null)
  const detectRef = useRef(null)
  const modelRef = useRef(null)
  const faceMissingCountRef = useRef(0)
  const [modelLoaded, setModelLoaded] = useState(false)

  const postEvent = async (payload, useBeacon = false) => {
    const url = 'http://localhost:4000/api/proctor/event'
    const body = JSON.stringify(payload)
    try {
      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } else {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        })
      }
    } catch (err) {
      console.warn('event post failed', err)
    }
  }

  useEffect(() => {
    let mounted = true

    async function startCameraAndModel() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (!mounted) return
        if (videoRef.current) videoRef.current.srcObject = stream

        const blazeface = await import('@tensorflow-models/blazeface')
        modelRef.current = await blazeface.load()
        setModelLoaded(true)

        // snapshot every 5s
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return
          const video = videoRef.current
          const w = video.videoWidth || 320
          const h = video.videoHeight || 240
          if (w === 0 || h === 0) return
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(video, 0, 0, w, h)
          const dataUrl = canvas.toDataURL('image/png')
          await fetch('http://localhost:4000/api/proctor/snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, examId, imageBase64: dataUrl, timestamp: new Date().toISOString() })
          })
        }, 5000)

        // detection every 1s
        async function detectLoop() {
          if (!videoRef.current || !modelRef.current) return
          const predictions = await modelRef.current.estimateFaces(videoRef.current, false)
          const count = predictions.length

          if (count === 0) faceMissingCountRef.current += 1
          else faceMissingCountRef.current = 0

          let suspicionScore = 0
          if (count === 0) suspicionScore += Math.min(1, faceMissingCountRef.current / 3) * 0.6
          if (count > 1) suspicionScore += 0.8

          suspicionScore = Math.min(1, Math.round(suspicionScore * 100) / 100)
          const ts = new Date().toISOString()

          if (count === 0 && faceMissingCountRef.current >= 2) {
            postEvent({ userId, examId, type: 'face_missing', details: { suspicionScore }, timestamp: ts })
          } else if (count > 1) {
            postEvent({ userId, examId, type: 'multiple_faces', details: { suspicionScore }, timestamp: ts })
          } else if (count === 1) {
            postEvent({ userId, examId, type: 'face_present', details: { suspicionScore }, timestamp: ts })
          }

          detectRef.current = setTimeout(detectLoop, 1000)
        }
        detectLoop()

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') {
            postEvent({ userId, examId, type: 'tab_switch', timestamp: new Date().toISOString() }, true)
          } else {
            postEvent({ userId, examId, type: 'tab_return', timestamp: new Date().toISOString() })
          }
        })
      } catch (err) {
        alert("Camera access or model load failed")
      }
    }
    startCameraAndModel()

    return () => {
      mounted = false
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (detectRef.current) clearTimeout(detectRef.current)
    }
  }, [userId, examId])

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: 320, height: 240, border: '1px solid #ccc' }} />
      <p>{modelLoaded ? "Face detection active ✅" : "Loading model..."}</p>
    </div>
  )
}
