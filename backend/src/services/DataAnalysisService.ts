/**
 * Data Analysis Service
 * Provides data analysis and visualization capabilities
 * Supports CSV, JSON, and tabular data analysis
 * 
 * @module DataAnalysisService
 */

import { logger } from '../utils/logger.js';
import { aiRouter } from './AIRouter.js';

// ============================================
// Types
// ============================================

export interface DataColumn {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean' | 'mixed';
  uniqueValues: number;
  nullCount: number;
  sampleValues: any[];
}

export interface DataSummary {
  rowCount: number;
  columnCount: number;
  columns: DataColumn[];
  numericStats: Record<string, NumericStats>;
  categoricalStats: Record<string, CategoricalStats>;
}

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  sum: number;
}

export interface CategoricalStats {
  uniqueValues: number;
  topValues: Array<{ value: string; count: number }>;
  mode: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
  title: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }>;
}

export interface AnalysisResult {
  summary: DataSummary;
  insights: string[];
  charts: ChartData[];
  aiAnalysis?: string;
}

// ============================================
// Data Analysis Service Class
// ============================================

class DataAnalysisServiceClass {
  private readonly MAX_ROWS_FOR_ANALYSIS = 10000;
  private readonly MAX_UNIQUE_FOR_CATEGORICAL = 50;

  /**
   * Parse CSV string to data array
   */
  public parseCSV(csvString: string): { headers: string[]; rows: any[][] } {
    const lines = csvString.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('Empty CSV data');
    }
    
    // Parse headers
    const headers = this.parseCSVLine(lines[0]);
    
    // Parse rows
    const rows: any[][] = [];
    for (let i = 1; i < Math.min(lines.length, this.MAX_ROWS_FOR_ANALYSIS + 1); i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length === headers.length) {
        rows.push(row.map(val => this.parseValue(val)));
      }
    }
    
    return { headers, rows };
  }

  /**
   * Parse a single CSV line handling quotes
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Parse value to appropriate type
   */
  private parseValue(value: string): any {
    const trimmed = value.trim();
    
    // Check for null/empty
    if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'na') {
      return null;
    }
    
    // Check for boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    // Check for number
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return num;
    }
    
    // Check for date
    const date = new Date(trimmed);
    if (!isNaN(date.getTime()) && trimmed.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/)) {
      return date;
    }
    
    return trimmed;
  }

  /**
   * Detect column type
   */
  private detectColumnType(values: any[]): 'number' | 'string' | 'date' | 'boolean' | 'mixed' {
    const nonNullValues = values.filter(v => v !== null);
    if (nonNullValues.length === 0) return 'mixed';
    
    const types = new Set(nonNullValues.map(v => {
      if (typeof v === 'number') return 'number';
      if (typeof v === 'boolean') return 'boolean';
      if (v instanceof Date) return 'date';
      return 'string';
    }));
    
    if (types.size === 1) {
      return types.values().next().value || 'mixed';
    }
    
    return 'mixed';
  }

  /**
   * Analyze data and generate summary
   */
  public analyzeData(
    headers: string[],
    rows: any[][]
  ): DataSummary {
    const columns: DataColumn[] = [];
    const numericStats: Record<string, NumericStats> = {};
    const categoricalStats: Record<string, CategoricalStats> = {};
    
    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const colName = headers[colIndex];
      const colValues = rows.map(row => row[colIndex]);
      const nonNullValues = colValues.filter(v => v !== null);
      const colType = this.detectColumnType(colValues);
      
      // Get unique values
      const uniqueSet = new Set(nonNullValues.map(v => String(v)));
      
      columns.push({
        name: colName,
        type: colType,
        uniqueValues: uniqueSet.size,
        nullCount: colValues.filter(v => v === null).length,
        sampleValues: nonNullValues.slice(0, 5),
      });
      
      // Calculate stats based on type
      if (colType === 'number') {
        const numValues = nonNullValues as number[];
        numericStats[colName] = this.calculateNumericStats(numValues);
      } else if (colType === 'string' && uniqueSet.size <= this.MAX_UNIQUE_FOR_CATEGORICAL) {
        categoricalStats[colName] = this.calculateCategoricalStats(nonNullValues as string[]);
      }
    }
    
    return {
      rowCount: rows.length,
      columnCount: headers.length,
      columns,
      numericStats,
      categoricalStats,
    };
  }

  /**
   * Calculate numeric statistics
   */
  private calculateNumericStats(values: number[]): NumericStats {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, sum: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    // Calculate standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Calculate median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      sum: Math.round(sum * 100) / 100,
    };
  }

  /**
   * Calculate categorical statistics
   */
  private calculateCategoricalStats(values: string[]): CategoricalStats {
    const counts: Record<string, number> = {};
    
    for (const value of values) {
      counts[value] = (counts[value] || 0) + 1;
    }
    
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);
    
    return {
      uniqueValues: sorted.length,
      topValues: sorted.slice(0, 10).map(([value, count]) => ({ value, count })),
      mode: sorted[0]?.[0] || '',
    };
  }

  /**
   * Generate chart data suggestions
   */
  public generateCharts(
    headers: string[],
    rows: any[][],
    summary: DataSummary
  ): ChartData[] {
    const charts: ChartData[] = [];
    
    // Generate histogram for numeric columns
    for (const [colName, stats] of Object.entries(summary.numericStats)) {
      const colIndex = headers.indexOf(colName);
      const values = rows.map(r => r[colIndex]).filter(v => v !== null) as number[];
      
      const histogram = this.createHistogram(values, 10);
      charts.push({
        type: 'histogram',
        title: `Distribution of ${colName}`,
        labels: histogram.labels,
        datasets: [{
          label: colName,
          data: histogram.counts,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
        }],
      });
    }
    
    // Generate bar chart for categorical columns
    for (const [colName, stats] of Object.entries(summary.categoricalStats)) {
      charts.push({
        type: 'bar',
        title: `${colName} Distribution`,
        labels: stats.topValues.map(v => v.value),
        datasets: [{
          label: 'Count',
          data: stats.topValues.map(v => v.count),
          backgroundColor: this.generateColors(stats.topValues.length),
        }],
      });
    }
    
    return charts.slice(0, 5); // Limit to 5 charts
  }

  /**
   * Create histogram bins
   */
  private createHistogram(values: number[], numBins: number): { labels: string[]; counts: number[] } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / numBins;
    
    const bins = new Array(numBins).fill(0);
    const labels: string[] = [];
    
    for (let i = 0; i < numBins; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      labels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    }
    
    for (const value of values) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), numBins - 1);
      bins[binIndex]++;
    }
    
    return { labels, counts: bins };
  }

  /**
   * Generate colors for charts
   */
  private generateColors(count: number): string[] {
    const baseColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(255, 99, 255, 0.7)',
      'rgba(99, 255, 132, 0.7)',
    ];
    
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }

  /**
   * Generate AI insights about the data
   */
  public async generateInsights(summary: DataSummary): Promise<string[]> {
    const insights: string[] = [];
    
    // Basic insights
    insights.push(`Dataset contains ${summary.rowCount} rows and ${summary.columnCount} columns.`);
    
    // Numeric column insights
    for (const [colName, stats] of Object.entries(summary.numericStats)) {
      if (stats.stdDev > stats.mean * 0.5) {
        insights.push(`${colName} has high variability (std dev: ${stats.stdDev}).`);
      }
      if (stats.max > stats.mean * 10) {
        insights.push(`${colName} may have outliers (max: ${stats.max}, mean: ${stats.mean}).`);
      }
    }
    
    // Categorical column insights
    for (const [colName, stats] of Object.entries(summary.categoricalStats)) {
      if (stats.topValues[0]?.count > summary.rowCount * 0.5) {
        insights.push(`${colName} is dominated by "${stats.topValues[0].value}" (${Math.round(stats.topValues[0].count / summary.rowCount * 100)}%).`);
      }
    }
    
    // Null value insights
    for (const col of summary.columns) {
      if (col.nullCount > summary.rowCount * 0.1) {
        insights.push(`${col.name} has ${Math.round(col.nullCount / summary.rowCount * 100)}% missing values.`);
      }
    }
    
    return insights;
  }

  /**
   * Full analysis with AI
   */
  public async analyzeWithAI(
    headers: string[],
    rows: any[][],
    question?: string
  ): Promise<AnalysisResult> {
    const summary = this.analyzeData(headers, rows);
    const charts = this.generateCharts(headers, rows, summary);
    const insights = await this.generateInsights(summary);
    
    let aiAnalysis: string | undefined;
    
    if (question) {
      // Use AI to answer specific question
      const dataPreview = rows.slice(0, 20).map(row => 
        headers.reduce((obj, h, i) => ({ ...obj, [h]: row[i] }), {})
      );
      
      const prompt = `Analyze this dataset and answer the question.

Dataset Summary:
- Rows: ${summary.rowCount}
- Columns: ${summary.columnCount}
- Columns: ${headers.join(', ')}

Numeric Statistics:
${JSON.stringify(summary.numericStats, null, 2)}

Sample Data (first 20 rows):
${JSON.stringify(dataPreview, null, 2)}

Question: ${question}

Provide a clear, data-driven answer.`;

      try {
        const response = await aiRouter.chat({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 1000,
        });
        
        aiAnalysis = response.content;
      } catch (error) {
        logger.error('AI analysis failed:', error);
      }
    }
    
    return {
      summary,
      insights,
      charts,
      aiAnalysis,
    };
  }

  /**
   * Format data summary for chat context
   */
  public formatForChat(summary: DataSummary): string {
    let context = '\n\n## 📊 DATA ANALYSIS\n\n';
    
    context += `**Dataset Overview:**\n`;
    context += `- Rows: ${summary.rowCount}\n`;
    context += `- Columns: ${summary.columnCount}\n\n`;
    
    context += `**Columns:**\n`;
    for (const col of summary.columns) {
      context += `- ${col.name} (${col.type}): ${col.uniqueValues} unique values`;
      if (col.nullCount > 0) {
        context += `, ${col.nullCount} nulls`;
      }
      context += '\n';
    }
    
    if (Object.keys(summary.numericStats).length > 0) {
      context += '\n**Numeric Statistics:**\n';
      for (const [colName, stats] of Object.entries(summary.numericStats)) {
        context += `- ${colName}: min=${stats.min}, max=${stats.max}, mean=${stats.mean}, median=${stats.median}\n`;
      }
    }
    
    return context;
  }
}

// Export singleton instance
export const dataAnalysis = new DataAnalysisServiceClass();
export default dataAnalysis;
