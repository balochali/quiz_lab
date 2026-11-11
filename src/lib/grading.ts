export function calculateScore(answers: { option: { correct: boolean }; question: { marks: number } }[]) {
  return answers.reduce((score, answer) => score + (answer.option.correct ? answer.question.marks : 0), 0);
}
