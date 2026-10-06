export async function processBatch(issues, processIssue) {
  const results = [];
  for (const issue of [...issues].sort((a,b) => a.number-b.number)) {
    try {
      results.push({ number: issue.number, title: issue.title, ...await processIssue(issue) });
    } catch (error) {
      results.push({ number: issue.number, title: issue.title, status: 'failed', error: error.message });
    }
  }
  return results;
}
