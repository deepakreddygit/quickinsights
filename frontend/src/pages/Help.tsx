// src/pages/Help.tsx
import { Link } from "react-router-dom";

export default function Help() {
  return (
    <div className="max-w-3xl mx-auto p-6 leading-relaxed text-neutral-800">
      <h1 className="text-2xl font-bold mb-4">Help & Guide</h1>

      <p className="mb-6">
        Welcome to <strong>QuickInsights</strong>. This guide will help you get started with 
        uploading your data, exploring it through charts, and using the insight tools available 
        on the platform.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to the <Link to="/dashboard" className="underline">Dashboard</Link>.</li>
          <li>Click <em>Upload</em> and select a CSV file from your computer.</li>
          <li>Once uploaded, you’ll immediately see a summary of your dataset along with charts.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Explore Your Data</h2>
        <p>
          Use the <strong>Explore</strong> section to zoom into time-based data and apply filters. 
          As you interact, the table below the chart will instantly update to reflect your selections.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Insights</h2>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Correlation Map</strong> — see how different numeric columns relate to each other.</li>
          <li><strong>AI Narrative</strong> — read plain-language highlights and trends about your data.</li>
          <li><strong>Anomaly Detection</strong> — quickly find unusual rows or patterns that stand out.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Common Questions</h2>
        <details className="mb-2 p-2 border rounded-lg">
          <summary className="cursor-pointer font-medium">Why doesn’t my date column work in line charts?</summary>
          <p className="mt-2 text-sm text-neutral-700">
            Make sure your column contains valid dates (e.g. <code className="bg-neutral-100 px-1 rounded">2023-01-31</code>). 
            If not, adjust your CSV file so the values are proper dates.
          </p>
        </details>
        <details className="p-2 border rounded-lg">
          <summary className="cursor-pointer font-medium">Why am I seeing a “Network Error”?</summary>
          <p className="mt-2 text-sm text-neutral-700">
            This usually happens if the server is temporarily unreachable. Please try again, 
            or refresh the page. If the issue continues, check your internet connection.
          </p>
        </details>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Tips</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Drag across the mini-chart to zoom into a specific time range.</li>
          <li>Click on filter options to quickly narrow down your dataset.</li>
          <li>Export any chart as a CSV file using the export button on the chart toolbar.</li>
        </ul>
      </section>

      <p className="text-sm text-neutral-500">
        Need more help? Reach out to our support team or check future updates in this Help section.
      </p>
    </div>
  );
}
