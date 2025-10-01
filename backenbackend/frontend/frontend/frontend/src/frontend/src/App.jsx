import React, { useState } from 'react'
import Exam from './pages/Exam'

export default function App() {
  const [userId, setUserId] = useState("")
  const [examId, setExamId] = useState("")
  const [started, setStarted] = useState(false)

  const startExam = () => {
    if (userId && examId) setStarted(true)
    else alert("Please enter User ID and Exam ID")
  }

  return (
    <div style={{ padding: 20 }}>
      {!started ? (
        <div>
          <h1>Secure Online Exam System</h1>
          <input placeholder="User ID" value={userId} onChange={e => setUserId(e.target.value)} />
          <br /><br />
          <input placeholder="Exam ID" value={examId} onChange={e => setExamId(e.target.value)} />
          <br /><br />
          <button onClick={startExam}>Start Exam</button>
        </div>
      ) : (
        <Exam userId={userId} examId={examId} />
      )}
    </div>
  )
}
