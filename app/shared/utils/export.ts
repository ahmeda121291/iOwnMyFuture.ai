import { type JournalEntry } from '../../core/types';
import { type Goal } from '../../services/goals.service';

interface ExportData {
  insights?: {
    aiReport: string;
    metrics: any;
    recommendations: any[];
  };
  journalEntries?: JournalEntry[];
  goals?: Goal[];
  moodData?: any[];
  progressData?: any[];
  timeframe?: string;
  generatedAt?: string;
}

/**
 * Generate PDF report from insights data
 */
export async function exportToPDF(data: ExportData, filename: string = 'insights-report.pdf'): Promise<void> {
  // Create a printable HTML document
  const html = generateHTMLReport(data);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check your popup blocker settings.');
  }
  
  // Write the HTML content
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then trigger print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    
    // Close the window after a delay (gives time for print dialog)
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  };
}

/**
 * Generate CSV report from insights data
 */
export function exportToCSV(data: ExportData, filename: string = 'insights-report.csv'): void {
  const csvContent = generateCSVContent(data);
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
}

/**
 * Generate HTML report for PDF export
 */
function generateHTMLReport(data: ExportData): string {
  const { insights, journalEntries, goals, moodData, progressData, timeframe, generatedAt } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>MyFutureSelf Insights Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: #8A2BE2;
          margin-bottom: 10px;
          font-size: 32px;
        }
        h2 {
          color: #6B46C1;
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 24px;
          border-bottom: 2px solid #E5E7EB;
          padding-bottom: 5px;
        }
        h3 {
          color: #4B5563;
          margin-top: 20px;
          margin-bottom: 10px;
          font-size: 18px;
        }
        .header {
          border-bottom: 3px solid #8A2BE2;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .subtitle {
          color: #6B7280;
          font-size: 14px;
        }
        .metric {
          display: inline-block;
          margin: 10px 20px 10px 0;
        }
        .metric-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #1F2937;
        }
        .insight-box {
          background: #F9FAFB;
          border-left: 4px solid #8A2BE2;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .recommendation {
          background: #FEF3C7;
          border-left: 4px solid #F59E0B;
          padding: 10px 15px;
          margin: 10px 0;
          border-radius: 4px;
        }
        .goal-item {
          background: #F0FDF4;
          border-left: 4px solid #10B981;
          padding: 10px 15px;
          margin: 10px 0;
          border-radius: 4px;
        }
        .progress-bar {
          background: #E5E7EB;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin: 5px 0;
        }
        .progress-fill {
          background: #8A2BE2;
          height: 100%;
          transition: width 0.3s;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #E5E7EB;
        }
        th {
          background: #F9FAFB;
          font-weight: 600;
          color: #4B5563;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          color: #6B7280;
          font-size: 12px;
          text-align: center;
        }
        @media print {
          body {
            padding: 20px;
          }
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MyFutureSelf Insights Report</h1>
        <p class="subtitle">Generated on ${generatedAt || new Date().toLocaleDateString()} | Timeframe: ${timeframe || 'Last 30 days'}</p>
      </div>
      
      ${insights ? `
        <section>
          <h2>AI Insights</h2>
          <div class="insight-box">
            <p>${insights.aiReport.replace(/\n/g, '<br>')}</p>
          </div>
        </section>
        
        ${insights.metrics ? `
          <section>
            <h2>Key Metrics</h2>
            <div>
              <div class="metric">
                <div class="metric-label">Total Entries</div>
                <div class="metric-value">${insights.metrics.totalEntries || 0}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Current Streak</div>
                <div class="metric-value">${insights.metrics.currentStreak || 0} days</div>
              </div>
              <div class="metric">
                <div class="metric-label">Avg Words/Entry</div>
                <div class="metric-value">${insights.metrics.avgWordsPerEntry || 0}</div>
              </div>
            </div>
          </section>
        ` : ''}
        
        ${insights.recommendations && insights.recommendations.length > 0 ? `
          <section>
            <h2>Recommendations</h2>
            ${insights.recommendations.map(rec => `
              <div class="recommendation">
                <strong>${rec.title || 'Recommendation'}</strong>
                <p>${rec.description || rec}</p>
              </div>
            `).join('')}
          </section>
        ` : ''}
      ` : ''}
      
      ${goals && goals.length > 0 ? `
        <section class="page-break">
          <h2>Goals Progress</h2>
          ${goals.filter(g => g.status === 'active').map(goal => `
            <div class="goal-item">
              <h3>${goal.title}</h3>
              ${goal.description ? `<p>${goal.description}</p>` : ''}
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${goal.progress}%"></div>
              </div>
              <p style="font-size: 12px; color: #6B7280; margin-top: 5px;">
                Progress: ${goal.progress}% 
                ${goal.target_date ? `| Target: ${new Date(goal.target_date).toLocaleDateString()}` : ''}
              </p>
            </div>
          `).join('')}
        </section>
      ` : ''}
      
      ${progressData && progressData.length > 0 ? `
        <section>
          <h2>Activity Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Journal Entries</th>
                <th>Goals Completed</th>
                <th>Moodboard Updates</th>
              </tr>
            </thead>
            <tbody>
              ${progressData.slice(-7).reverse().map(day => `
                <tr>
                  <td>${day.date}</td>
                  <td>${day.journalEntries}</td>
                  <td>${day.goalProgress}</td>
                  <td>${day.moodboardUpdates}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
      ` : ''}
      
      ${journalEntries && journalEntries.length > 0 ? `
        <section class="page-break">
          <h2>Recent Journal Entries</h2>
          ${journalEntries.slice(0, 5).map(entry => `
            <div style="margin: 20px 0; padding: 15px; background: #F9FAFB; border-radius: 8px;">
              <h3>${new Date(entry.entry_date).toLocaleDateString()}</h3>
              ${entry.ai_summary ? `
                <div style="margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #8A2BE2;">
                  <strong>Summary:</strong> ${entry.ai_summary}
                </div>
              ` : ''}
              ${entry.mood ? `<p><strong>Mood:</strong> ${entry.mood}</p>` : ''}
              ${entry.tags && entry.tags.length > 0 ? `
                <p><strong>Tags:</strong> ${entry.tags.join(', ')}</p>
              ` : ''}
            </div>
          `).join('')}
        </section>
      ` : ''}
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} MyFutureSelf.ai | Confidential Report</p>
        <p>This report contains personal information and should be kept secure.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate CSV content from insights data
 */
function generateCSVContent(data: ExportData): string {
  const lines: string[] = [];
  
  // Header
  lines.push('MyFutureSelf Insights Report');
  lines.push(`Generated: ${data.generatedAt || new Date().toISOString()}`);
  lines.push(`Timeframe: ${data.timeframe || 'Last 30 days'}`);
  lines.push('');
  
  // Metrics
  if (data.insights?.metrics) {
    lines.push('KEY METRICS');
    lines.push('Metric,Value');
    lines.push(`Total Entries,${data.insights.metrics.totalEntries || 0}`);
    lines.push(`Current Streak,${data.insights.metrics.currentStreak || 0}`);
    lines.push(`Average Words per Entry,${data.insights.metrics.avgWordsPerEntry || 0}`);
    lines.push(`Entries This Month,${data.insights.metrics.entriesChange || 'N/A'}`);
    lines.push('');
  }
  
  // Goals
  if (data.goals && data.goals.length > 0) {
    lines.push('GOALS PROGRESS');
    lines.push('Title,Status,Progress,Category,Priority,Target Date');
    data.goals.forEach(goal => {
      lines.push([
        `"${goal.title}"`,
        goal.status,
        `${goal.progress}%`,
        goal.category || 'N/A',
        goal.priority.toString(),
        goal.target_date || 'N/A'
      ].join(','));
    });
    lines.push('');
  }
  
  // Progress Data
  if (data.progressData && data.progressData.length > 0) {
    lines.push('DAILY ACTIVITY');
    lines.push('Date,Journal Entries,Goals Completed,Moodboard Updates');
    data.progressData.forEach(day => {
      lines.push([
        day.date,
        day.journalEntries,
        day.goalProgress,
        day.moodboardUpdates
      ].join(','));
    });
    lines.push('');
  }
  
  // Journal Entries Summary
  if (data.journalEntries && data.journalEntries.length > 0) {
    lines.push('RECENT JOURNAL ENTRIES');
    lines.push('Date,Mood,Tags,Summary');
    data.journalEntries.slice(0, 10).forEach(entry => {
      lines.push([
        entry.entry_date,
        entry.mood || 'N/A',
        `"${(entry.tags || []).join('; ')}"`,
        `"${(entry.ai_summary || '').replace(/"/g, '""')}"`
      ].join(','));
    });
  }
  
  return lines.join('\n');
}