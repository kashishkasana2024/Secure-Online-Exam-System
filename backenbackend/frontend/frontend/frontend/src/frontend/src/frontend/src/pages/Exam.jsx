import React from 'react'
import ProctorCamera from '../components/ProctorCamera'

export default function Exam({ userId, examId }) {
  return (
    <div>
      <h2>Exam Page - {examId}</h2>
      <p>User: {userId}</p>
      <ProctorCamera userId={userId} examId={examId} />
      <hr />
      <p>Question 1: What is 2 + 2?</p>
      <input placeholder="Your answer" />
    </div>
  )
}
