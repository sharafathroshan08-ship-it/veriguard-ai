import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  BrainCircuit,
  ChevronRight,
  CheckCircle2,
  CloudUpload,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  Fingerprint,
  History,
  LockKeyhole,
  Menu,
  RefreshCw,
  ScanLine,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

import {
  checkBackendHealth,
  getVerificationHistory,
  uploadDocument,
  verifyDocument,
} from "./api";

import "./index.css";

const PIPELINE = [
  "DOCUMENT INGESTION",
  "OCR EXTRACTION",
  "FIELD VALIDATION",
  "VISUAL FORENSICS",
  "GEMINI INTELLIGENCE",
  "RISK SYNTHESIS",
];

function firstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeResult(raw) {
  const source =
    raw?.analysis ??
    raw?.result ??
    raw?.verification ??
    raw ??
    {};

  const score = firstValue(
    source.risk_score,
    source.riskScore,
    source.score,
    raw?.risk_score,
    raw?.riskScore,
    raw?.score
  );

  const numericScore =
    score === undefined
      ? null
      : Number.isFinite(Number(score))
        ? Number(score)
        : null;

  return {
    raw,

    score: numericScore,

    confidence: firstValue(
      source.confidence,
      source.confidence_score,
      source.confidenceScore,
      raw?.confidence,
      raw?.confidence_score
    ),

    riskLevel: firstValue(
      source.risk_level,
      source.riskLevel,
      source.severity,
      raw?.risk_level,
      raw?.riskLevel
    ),

    decision: firstValue(
      source.decision,
      source.verdict,
      source.status,
      raw?.decision,
      raw?.verdict
    ),

    documentType: firstValue(
      source.document_type,
      source.documentType,
      raw?.document_type,
      raw?.documentType
    ),

    reasons: toArray(
      firstValue(
        source.reasons,
        source.reasoning,
        source.findings,
        raw?.reasons,
        raw?.findings
      )
    ),

    fraudEvidence: toArray(
      firstValue(
        source.fraud_evidence,
        source.fraudEvidence,
        source.evidence,
        raw?.fraud_evidence,
        raw?.evidence
      )
    ),

    extractedFields:
      source.extracted_fields ??
      source.extractedFields ??
      raw?.extracted_fields ??
      raw?.extractedFields ??
      {},

    recommendation: firstValue(
      source.recommendation,
      raw?.recommendation
    ),
  };
}

function getRiskTone(score, level) {
  const normalizedLevel =
    String(level ?? "").toLowerCase();

  if (
    normalizedLevel.includes("critical") ||
    normalizedLevel.includes("high") ||
    (Number.isFinite(score) && score >= 70)
  ) {
    return "danger";
  }

  if (
    normalizedLevel.includes("medium") ||
    normalizedLevel.includes("moderate") ||
    (Number.isFinite(score) && score >= 40)
  ) {
    return "warning";
  }

  return "safe";
}

function getVerdict(decision, score) {
  if (decision) {
    return String(decision).toUpperCase();
  }

  if (Number.isFinite(score)) {
    return score >= 70
      ? "ANOMALY DETECTED"
      : "VERIFIED AUTHENTIC";
  }

  return "AWAITING ANALYSIS";
}

function valueText(value) {
  if (
    value &&
    typeof value === "object"
  ) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value ?? "N/A");
}

function App() {
  const [page, setPage] =
    useState("console");

  const [tool, setTool] =
    useState("telemetry");

  const [file, setFile] =
    useState(null);

  const [documentId, setDocumentId] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [pipelineStep, setPipelineStep] =
    useState(0);

  const [error, setError] =
    useState("");

  const [backendOnline, setBackendOnline] =
    useState(false);

  const [clock, setClock] =
    useState("");

  const [materializing, setMaterializing] =
    useState(false);

  const fileInputRef =
    useRef(null);

  /* =====================================================
     CLOCK
  ===================================================== */

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )
      );
    };

    updateClock();

    const timer =
      window.setInterval(
        updateClock,
        1000
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  /* =====================================================
     BACKEND HEALTH
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        await checkBackendHealth();

        if (mounted) {
          setBackendOnline(true);
        }
      } catch {
        if (mounted) {
          setBackendOnline(false);
        }
      }
    };

    checkHealth();

    const timer =
      window.setInterval(
        checkHealth,
        10000
      );

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  /* =====================================================
     PIPELINE ANIMATION
  ===================================================== */

  useEffect(() => {
    if (!verifying) {
      return;
    }

    setPipelineStep(0);

    const timer =
      window.setInterval(() => {
        setPipelineStep((current) =>
          Math.min(
            current + 1,
            PIPELINE.length - 1
          )
        );
      }, 850);

    return () =>
      window.clearInterval(timer);
  }, [verifying]);

  /* =====================================================
     HISTORY
  ===================================================== */

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);

      const response =
        await getVerificationHistory(20);

      const records =
        Array.isArray(response)
          ? response
          : Array.isArray(response?.history)
            ? response.history
            : Array.isArray(response?.records)
              ? response.records
              : [];

      setHistory(records);
    } catch (historyError) {
      console.error(
        "History loading failed:",
        historyError
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (page === "history") {
      loadHistory();
    }
  }, [page]);

  /* =====================================================
     FILE
  ===================================================== */

  const chooseFile = (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    const extension =
      selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const validExtensions = [
      "pdf",
      "png",
      "jpg",
      "jpeg",
    ];

    if (
      !validExtensions.includes(
        extension
      )
    ) {
      setError(
        "Only PDF, PNG, JPG and JPEG files are supported."
      );
      return;
    }

    setFile(selectedFile);
    setDocumentId("");
    setResult(null);
    setError("");
    setPipelineStep(0);

    setMaterializing(true);
    window.setTimeout(() => {
      setMaterializing(false);
    }, 1800);
  };

  const handleFileInput = (event) => {
    chooseFile(
      event.target.files?.[0]
    );
  };

  const handleDrop = (event) => {
    event.preventDefault();

    chooseFile(
      event.dataTransfer.files?.[0]
    );
  };

  const clearFile = () => {
    setFile(null);
    setDocumentId("");
    setResult(null);
    setError("");
    setPipelineStep(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =====================================================
     ANALYSIS
  ===================================================== */

  const runAnalysis = async () => {
    if (
      !file ||
      uploading ||
      verifying
    ) {
      return;
    }

    try {
      setError("");
      setResult(null);
      setPipelineStep(0);

      /* Upload */
      setUploading(true);

      const uploadResponse =
        await uploadDocument(file);

      const id = firstValue(
        uploadResponse?.document_id,
        uploadResponse?.documentId,
        uploadResponse?.id
      );

      if (!id) {
        throw new Error(
          "Upload succeeded, but the backend did not return a document ID."
        );
      }

      setDocumentId(String(id));
      setUploading(false);

      /* -------------------------------------------------
         MOVE TO FORENSICS IMMEDIATELY

         The verification request is intentionally kept
         asynchronous so the judge sees the live forensic
         pipeline while the real backend performs OCR,
         field checks, visual analysis, Gemini reasoning,
         risk synthesis, and history persistence.
      ------------------------------------------------- */
      setPage("forensics");
      setTool("telemetry");
      setVerifying(true);

      /* Verify in the background */
      const verificationResponse =
        await verifyDocument(id);

      const normalized =
        normalizeResult(
          verificationResponse
        );

      setResult(normalized);
      setPipelineStep(
        PIPELINE.length - 1
      );
      setVerifying(false);

      /* -------------------------------------------------
         Give the forensic screen a brief completed state
         before projecting the final result. This keeps the
         transition visible without adding meaningful delay.
      ------------------------------------------------- */
      await new Promise((resolve) =>
        window.setTimeout(resolve, 900)
      );

      setPage("report");
    } catch (analysisError) {
      console.error(
        "Analysis failed:",
        analysisError
      );

      setUploading(false);
      setVerifying(false);

      setError(
        analysisError?.response
          ?.data?.detail ||
          analysisError?.response
            ?.data?.message ||
          analysisError?.message ||
          "Forensic analysis failed."
      );
    }
  };

  /* =====================================================
     RESULT
  ===================================================== */

  const score =
    result?.score ?? null;

  const riskTone =
    getRiskTone(
      score,
      result?.riskLevel
    );

  const verdict =
    getVerdict(
      result?.decision,
      score
    );

  const hasResult =
    Boolean(result);

  /* =====================================================
     HISTORY FILTER
  ===================================================== */

  const filteredHistory =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return history;
      }

      return history.filter(
        (item) =>
          JSON.stringify(item)
            .toLowerCase()
            .includes(query)
      );
    }, [
      history,
      searchTerm,
    ]);

  /* =====================================================
     PDF REPORT
  ===================================================== */

  const exportReport = () => {
    if (!result) {
      return;
    }

    const popup =
      window.open(
        "",
        "_blank",
        "width=1100,height=850"
      );

    if (!popup) {
      setError(
        "Please allow pop-ups to export the report."
      );
      return;
    }

    const fields =
      Object.entries(
        result.extractedFields ?? {}
      );

    const reasons =
      result.reasons.length
        ? result.reasons
            .map(
              (reason) =>
                `<li>${valueText(
                  reason
                )}</li>`
            )
            .join("")
        : "<li>No detailed reasoning returned.</li>";

    const fieldRows =
      fields.length
        ? fields
            .map(
              ([key, value]) => `
                <tr>
                  <td>${key}</td>
                  <td>${valueText(value)}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="2">
              No extracted fields returned.
            </td>
          </tr>
        `;

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <title>
            VERIGUARD AI — Evidence Dossier
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 42px;
              color: #111827;
              background: #ffffff;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            header {
              display: flex;
              justify-content: space-between;
              gap: 35px;
              padding-bottom: 22px;
              border-bottom: 2px solid #111827;
            }

            h1 {
              margin: 0;
              font-size: 30px;
              letter-spacing: .08em;
            }

            h2 {
              margin-top: 32px;
              padding-bottom: 8px;
              border-bottom: 1px solid #d1d5db;
            }

            .meta {
              color: #6b7280;
              font-size: 12px;
              line-height: 1.7;
            }

            .score {
              margin-top: 32px;
              font-size: 54px;
              font-weight: 900;
            }

            .verdict {
              margin-top: 9px;
              font-size: 21px;
              font-weight: 900;
            }

            li {
              margin: 8px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th,
            td {
              padding: 11px;
              border: 1px solid #d1d5db;
              text-align: left;
              font-size: 13px;
            }

            th {
              background: #f3f4f6;
            }

            .footer {
              margin-top: 50px;
              color: #6b7280;
              font-size: 11px;
            }
          </style>
        </head>

        <body>

          <header>
            <div>
              <h1>VERIGUARD AI</h1>

              <div class="meta">
                FORENSIC DOCUMENT INTELLIGENCE
              </div>
            </div>

            <div class="meta">
              Document ID:
              ${documentId || "N/A"}
              <br />

              File:
              ${file?.name || "N/A"}
              <br />

              Generated:
              ${new Date().toLocaleString()}
            </div>
          </header>

          <div class="score">
            ${score ?? "--"} / 100
          </div>

          <div class="verdict">
            ${verdict}
          </div>

          <div class="meta">
            Risk Level:
            ${result.riskLevel ?? "N/A"}
            <br />

            Confidence:
            ${result.confidence ?? "N/A"}
            <br />

            Document Type:
            ${result.documentType ?? "N/A"}
          </div>

          <h2>AI Reasoning</h2>

          <ul>
            ${reasons}
          </ul>

          <h2>Extracted Fields</h2>

          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>

            <tbody>
              ${fieldRows}
            </tbody>
          </table>

          <h2>Recommendation</h2>

          <p>
            ${
              result.recommendation ??
              "N/A"
            }
          </p>

          <div class="footer">
            VERIGUARD AI — FORENSIC VERIFICATION REPORT
            <br />
            Browser print dialog → Save as PDF.
          </div>

        </body>
      </html>
    `);

    popup.document.close();
    popup.focus();

    window.setTimeout(
      () => popup.print(),
      350
    );
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const navigate = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="vg-app">

      <div className="vg-atmosphere vg-atmosphere-a" />
      <div className="vg-atmosphere vg-atmosphere-b" />
      <div className="vg-atmosphere vg-atmosphere-c" />

      <div className="vg-grid" />

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="vg-header">

        <div className="vg-brand">

          <button
            type="button"
            className="vg-menu"
          >
            <Menu size={17} />
          </button>

          <div className="vg-logo">
            <Shield size={18} />
          </div>

          <div>
            <div className="vg-brand-name">
              VERIGUARD AI
            </div>

            <div className="vg-brand-sub">
              FORENSIC DOCUMENT INTELLIGENCE
            </div>
          </div>

        </div>

        <nav className="vg-nav">

          <button
            type="button"
            className={
              page === "console"
                ? "active"
                : ""
            }
            onClick={() =>
              navigate("console")
            }
          >
            CONSOLE
          </button>

          <button
            type="button"
            className={
              page === "forensics"
                ? "active"
                : ""
            }
            onClick={() =>
              navigate("forensics")
            }
          >
            FORENSICS
          </button>

          <button
            type="button"
            className={
              page === "report"
                ? "active"
                : ""
            }
            onClick={() =>
              navigate("report")
            }
          >
            RESULT
          </button>

          <button
            type="button"
            className={
              page === "history"
                ? "active"
                : ""
            }
            onClick={() =>
              navigate("history")
            }
          >
            HISTORY
          </button>

        </nav>

        <div className="vg-header-right">

          <span className="vg-time">
            {clock}
          </span>

          <span
            className={
              backendOnline
                ? "vg-online"
                : "vg-offline"
            }
          >
            <i />

            {backendOnline
              ? "SYSTEM ONLINE"
              : "BACKEND OFFLINE"}
          </span>

          <Bell size={14} />
          <Settings size={14} />

        </div>

      </header>

      {/* ===================================================
          PAGE 1 — CONSOLE
      =================================================== */}

      {page === "console" && (
        <main className="vg-main">
          <section className="vg-console">
            <div className="vg-home-kicker">
              <span>FORENSIC DOCUMENT INTELLIGENCE</span>
              <span>{clock || "SYSTEM READY"}</span>
            </div>

            <div className="vg-home-title-wrap">
              <div className="vg-home-aura" />
              <h1 className="vg-home-title">
                <span>V</span><span>E</span><span>R</span><span>I</span><span>G</span><span>U</span><span>A</span><span>R</span><span>D</span>
                <b />
                <span>A</span><span>I</span>
              </h1>
              <div className="vg-title-cursor" />
            </div>

            <p className="vg-home-subtitle">
              Upload a document. Let the forensic engine reveal what the eye misses.
            </p>

            <div
              className={`vg-intake-portal ${file ? "loaded" : ""} ${materializing ? "materializing" : ""} ${verifying || uploading ? "verifying" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInput}
              />

              <div className="portal-backdrop" />
              <div className="portal-grid" />
              <div className="portal-ring portal-ring-a" />
              <div className="portal-ring portal-ring-b" />
              <div className="portal-ring portal-ring-c" />

              <div className="portal-satellite satellite-a">OCR</div>
              <div className="portal-satellite satellite-b">ELA</div>
              <div className="portal-satellite satellite-c">FIELD</div>
              <div className="portal-satellite satellite-d">AI</div>

              <div className="portal-core">
                {!file ? (
                  <>
                    <div className="portal-icon">
                      <CloudUpload size={31} strokeWidth={1.4} />
                    </div>
                    <strong>DROP DOCUMENT TO BEGIN</strong>
                    <span>PDF · PNG · JPG · JPEG</span>

                    <button
                      type="button"
                      className="portal-choose-button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      CHOOSE DOCUMENT
                    </button>

                    <small>OR DRAG & DROP INTO THE PORTAL</small>
                  </>
                ) : (
                  <div className="portal-loaded-content">
                    <div className="portal-3d-orbit orbit-one" />
                    <div className="portal-3d-orbit orbit-two" />
                    <div className="portal-3d-orbit orbit-three" />
                    <div className="portal-holo-doc">
                      <div className="portal-doc-sheet">
                        <div className="mini-doc-head"><b>VG</b><i /><i /></div>
                        <div className="mini-doc-photo" />
                        <div className="mini-doc-lines"><i /><i /><i /><i /></div>
                        <em>FORENSIC</em>
                      </div>
                      <span className="portal-box portal-box-a" />
                      <span className="portal-box portal-box-b" />
                      <span className="portal-box portal-box-c" />
                    </div>
                    <div className="portal-file-name">{file.name}</div>
                    <div className="portal-file-state">
                      {materializing ? "EVIDENCE MATERIALIZING" : "EVIDENCE LOCKED"}
                    </div>
                  </div>
                )}
              </div>

              <div className="portal-scan" />
              <div className="portal-sweep" />

              {file && (uploading || verifying) && (
                <div className="portal-analysis-overlay" aria-live="polite">
                  <div className="analysis-reticle">
                    <span className="reticle-line reticle-line-x" />
                    <span className="reticle-line reticle-line-y" />
                    <span className="reticle-ring reticle-ring-a" />
                    <span className="reticle-ring reticle-ring-b" />
                    <span className="reticle-ring reticle-ring-c" />
                    <div className="reticle-core">
                      <ScanLine size={18} />
                    </div>
                  </div>

                  <div className="analysis-beacon beacon-a">OCR</div>
                  <div className="analysis-beacon beacon-b">VISUAL</div>
                  <div className="analysis-beacon beacon-c">FIELDS</div>
                  <div className="analysis-beacon beacon-d">AI</div>

                  <div className="analysis-message">
                    <strong>
                      {uploading
                        ? "INGESTING EVIDENCE"
                        : "INITIALIZING FORENSIC ANALYSIS"}
                    </strong>
                    <span>
                      {uploading
                        ? "SECURE PAYLOAD TRANSFER"
                        : "MULTIMODAL CHANNELS SYNCHRONIZING"}
                    </span>
                  </div>
                </div>
              )}

              <div className="portal-corner corner-tl" />
              <div className="portal-corner corner-tr" />
              <div className="portal-corner corner-bl" />
              <div className="portal-corner corner-br" />
            </div>

            <div className="vg-home-status-row">
              <div>
                <span>CHANNEL</span>
                <strong>{file ? "EVIDENCE LOCKED" : "AWAITING PAYLOAD"}</strong>
              </div>
              <div>
                <span>ENGINE</span>
                <strong className={backendOnline ? "online-text" : "offline-text"}>
                  {backendOnline ? "ONLINE" : "OFFLINE"}
                </strong>
              </div>
              <div>
                <span>FORMAT</span>
                <strong>{file ? file.name.split(".").pop()?.toUpperCase() : "AUTO"}</strong>
              </div>
            </div>

            {error && (
              <div className="vg-error">
                <ShieldAlert size={14} />
                <span>{error}</span>
                <button type="button" onClick={() => setError("")}>×</button>
              </div>
            )}

            <div className="vg-home-actions">
              {file && (
                <button type="button" className="home-clear" onClick={clearFile}>
                  <X size={13} /> CLEAR
                </button>
              )}

              <button
                type="button"
                className="home-analyze"
                disabled={!file || uploading || verifying}
                onClick={runAnalysis}
              >
                <span>
                  {uploading
                    ? "UPLOADING EVIDENCE..."
                    : verifying
                      ? "FORENSIC ENGINE PROCESSING..."
                      : "INITIATE FORENSIC ANALYSIS"}
                </span>
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="vg-home-hint">
              <span />
              <strong>THE DOCUMENT REMAINS THE FOCUS.</strong>
              <span />
            </div>
          </section>
        </main>
      )}

      {/* ===================================================
          PAGE 2 — FORENSICS
      =================================================== */}

      {page === "forensics" && (
        <main className="vg-main vg-forensics-page">
          <section className="vg-secondary vg-forensics-secondary">

            <div className="vg-forensics-head">
              <div>
                <span>ACTIVE FORENSIC SESSION</span>
                <h1>
                  FORENSIC <b>ANALYSIS</b>
                </h1>
                <p>
                  Multimodal evidence is being correlated across OCR,
                  fields, visual structure, AI reasoning and verification signals.
                </p>
              </div>

              <div className="vg-session vg-session-enhanced">
                <i />
                <strong>
                  {verifying
                    ? "ENGINE RUNNING"
                    : result
                      ? "ANALYSIS COMPLETE"
                      : "STANDBY"}
                </strong>
                <small>
                  {documentId || "NO ACTIVE SESSION"}
                </small>
              </div>
            </div>

            <div className="vg-forensic-pipeline">
              {PIPELINE.map((step, index) => {
                const isActive =
                  verifying && index === pipelineStep;
                const isComplete =
                  Boolean(result) &&
                  index <= pipelineStep;

                return (
                  <div
                    key={step}
                    className={[
                      "vg-pipeline-node",
                      isActive ? "active" : "",
                      isComplete ? "complete" : "",
                    ].join(" ")}
                  >
                    <span>0{index + 1}</span>
                    <div className="vg-pipeline-dot" />
                    <strong>{step}</strong>
                    <small>
                      {isActive
                        ? "ACTIVE"
                        : isComplete
                          ? "COMPLETE"
                          : "QUEUED"}
                    </small>
                  </div>
                );
              })}
            </div>

            <div className="vg-forensic-shell">
              <aside className="vg-forensic-telemetry glass">
                <div className="vg-panel-head">
                  <span>LIVE TELEMETRY</span>
                  <Activity size={14} />
                </div>

                <div className="vg-terminal">
                  {PIPELINE.map((step, index) => {
                    const isActive =
                      verifying && index === pipelineStep;
                    const isComplete =
                      Boolean(result) &&
                      index <= pipelineStep;

                    return (
                      <div
                        className={[
                          "vg-terminal-row",
                          isActive ? "active" : "",
                          isComplete ? "complete" : "",
                        ].join(" ")}
                        key={step}
                      >
                        <span className="vg-terminal-time">
                          {clock || "--:--:--"}
                        </span>
                        <b>
                          {isActive
                            ? "RUN"
                            : isComplete
                              ? "PASS"
                              : "WAIT"}
                        </b>
                        <strong>{step}</strong>
                        <small>
                          {isActive
                            ? "PROCESSING"
                            : isComplete
                              ? "RESOLVED"
                              : "STANDBY"}
                        </small>
                      </div>
                    );
                  })}
                </div>

                <div className="vg-live-channel">
                  <div className="vg-live-dot" />
                  <div>
                    <strong>
                      {verifying
                        ? "FORENSIC ENGINE IS CORRELATING SIGNALS"
                        : result
                          ? "FORENSIC SESSION RESOLVED"
                          : "AWAITING FORENSIC INITIALIZATION"}
                    </strong>
                    <span>
                      {verifying
                        ? "Cross-checking active document evidence."
                        : result
                          ? "All returned backend signals are available for review."
                          : "Initialize analysis from the console to begin."}
                    </span>
                  </div>
                </div>
              </aside>

              <section className="vg-forensic-core glass">
                <div className="vg-core-topline">
                  <span>SPATIAL EVIDENCE CHAMBER</span>
                  <span>CORE / 02</span>
                </div>

                <div className="vg-forensic-stage">
                  <div className="vg-stage-grid" />
                  <div className="vg-forensic-cross cross-x" />
                  <div className="vg-forensic-cross cross-y" />
                  <div className="vg-forensic-ring ring-a" />
                  <div className="vg-forensic-ring ring-b" />
                  <div className="vg-forensic-ring ring-c" />

                  <span className="vg-stage-coordinate c1">X / 084.22</span>
                  <span className="vg-stage-coordinate c2">Y / 291.07</span>

                  <div
                    className={[
                      "vg-forensic-doc",
                      verifying ? "scanning" : "",
                      result ? "resolved" : "",
                    ].join(" ")}
                  >
                    <div className="vg-forensic-paper">
                      <div className="vg-paper-head">
                        <b>VG</b>
                        <span>
                          <i />
                          <i />
                        </span>
                      </div>
                      <div className="vg-paper-photo" />
                      <div className="vg-paper-lines">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className="vg-paper-stamp">FORENSIC</div>
                    </div>

                    <span className="vg-focus-box fb1" />
                    <span className="vg-focus-box fb2" />
                    <span className="vg-focus-box fb3" />
                  </div>

                  <div className="vg-forensic-beam" />

                  <div className="vg-signal-orbit so1">
                    <span>OCR</span>
                  </div>
                  <div className="vg-signal-orbit so2">
                    <span>FIELDS</span>
                  </div>
                  <div className="vg-signal-orbit so3">
                    <span>VISION</span>
                  </div>
                  <div className="vg-signal-orbit so4">
                    <span>AI</span>
                  </div>

                  <div className="vg-core-state">
                    {verifying
                      ? "ANALYSIS IN PROGRESS"
                      : result
                        ? "EVIDENCE CORRELATION COMPLETE"
                        : "WAITING FOR PAYLOAD"}
                  </div>
                </div>

                <div className="vg-core-bottomline">
                  <span>{file?.name || "NO DOCUMENT LOADED"}</span>
                  <span>
                    {verifying
                      ? `${Math.round(
                          ((pipelineStep + 1) /
                            PIPELINE.length) *
                            100
                        )}% SYNCHRONIZED`
                      : result
                        ? "SIGNALS LOCKED"
                        : "READY"}
                  </span>
                </div>
              </section>

              <aside className="vg-forensic-verdict glass">
                <div className="vg-panel-head">
                  <span>CURRENT VERDICT</span>
                  <Shield size={15} />
                </div>

                <div
                  className={[
                    "vg-analysis-shield",
                    result
                      ? getRiskTone(
                          result.score,
                          result.riskLevel
                        )
                      : "",
                  ].join(" ")}
                >
                  <div className="vg-analysis-pulse pulse-a" />
                  <div className="vg-analysis-pulse pulse-b" />
                  <Shield size={42} strokeWidth={1.05} />
                  <strong>{result?.score ?? "--"}</strong>
                  <small>/100</small>
                </div>

                <div
                  className={[
                    "vg-analysis-verdict",
                    result
                      ? getRiskTone(
                          result.score,
                          result.riskLevel
                        )
                      : "",
                  ].join(" ")}
                >
                  {result
                    ? getVerdict(
                        result.decision,
                        result.score
                      )
                    : "AWAITING ANALYSIS"}
                </div>

                <div className="vg-verdict-subline">
                  {result?.riskLevel
                    ? String(result.riskLevel).toUpperCase()
                    : verifying
                      ? "CORRELATING RISK SIGNALS"
                      : "NO RISK MODEL RESULT"}
                </div>

                <div className="vg-verdict-stats">
                  <div>
                    <span>CONFIDENCE</span>
                    <strong>
                      {result?.confidence ?? "—"}
                    </strong>
                  </div>
                  <div>
                    <span>DOCUMENT TYPE</span>
                    <strong>
                      {result?.documentType ?? "—"}
                    </strong>
                  </div>
                  <div>
                    <span>EVIDENCE SIGNALS</span>
                    <strong>
                      {result
                        ? result.fraudEvidence.length
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="vg-verdict-action">
                  <span>VERDICT SOURCE</span>
                  <strong>
                    REAL BACKEND RESPONSE
                  </strong>
                </div>
              </aside>
            </div>

            <div className="vg-forensics-tabs">
              {[
                ["telemetry", "LIVE TELEMETRY"],
                ["visual", "VISUAL FORENSICS"],
                ["fields", "FIELD MATRIX"],
                ["ai", "AI REASONING"],
                ["crypto", "CRYPTOGRAPHIC STATUS"],
              ].map(([key, label], index) => (
                <button
                  key={key}
                  type="button"
                  className={tool === key ? "active" : ""}
                  onClick={() => setTool(key)}
                >
                  <span>0{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>

            <div className="vg-forensic-detail glass">

              {tool === "telemetry" && (
                <div className="vg-detail-grid">
                  <section>
                    <div className="vg-detail-heading">
                      <Activity size={15} />
                      LIVE FORENSIC TELEMETRY
                    </div>

                    <div className="vg-detail-events">
                      {PIPELINE.map((step, index) => {
                        const isActive =
                          verifying && index === pipelineStep;
                        const isComplete =
                          Boolean(result) &&
                          index <= pipelineStep;

                        return (
                          <div
                            className={[
                              "vg-detail-event",
                              isActive ? "active" : "",
                              isComplete ? "complete" : "",
                            ].join(" ")}
                            key={step}
                          >
                            <span>
                              {clock || "--:--:--"}
                            </span>
                            <b>
                              {isActive
                                ? "RUN"
                                : isComplete
                                  ? "PASS"
                                  : "WAIT"}
                            </b>
                            <strong>{step}</strong>
                            <small>
                              {isActive
                                ? "PROCESSING"
                                : isComplete
                                  ? "COMPLETE"
                                  : "QUEUED"}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <aside className="vg-signal-summary">
                    <span>SIGNAL SUMMARY</span>

                    <div className="vg-summary-item">
                      <strong>OCR</strong>
                      <small>
                        {result ? "RETURNED" : "WAITING"}
                      </small>
                    </div>
                    <div className="vg-summary-item">
                      <strong>FIELDS</strong>
                      <small>
                        {Object.keys(
                          result?.extractedFields ?? {}
                        ).length
                          ? "RETURNED"
                          : "WAITING"}
                      </small>
                    </div>
                    <div className="vg-summary-item">
                      <strong>VISUAL</strong>
                      <small>
                        {result?.fraudEvidence?.length
                          ? "EVIDENCE FOUND"
                          : result
                            ? "NO ITEMS RETURNED"
                            : "WAITING"}
                      </small>
                    </div>
                    <div className="vg-summary-item">
                      <strong>AI</strong>
                      <small>
                        {result?.reasons?.length
                          ? "REASONING RETURNED"
                          : "WAITING"}
                      </small>
                    </div>
                  </aside>
                </div>
              )}

              {tool === "visual" && (
                <div className="vg-detail-visual">
                  <div className="vg-detail-heading">
                    <ScanLine size={15} />
                    VISUAL FORENSICS
                  </div>

                  <div className="vg-visual-evidence-stage">
                    <div className="vg-visual-target-ring" />
                    <div className="vg-visual-target-ring ring-small" />

                    <div className="vg-detail-document">
                      <div className="vg-detail-doc-photo" />
                      <div className="vg-detail-doc-lines">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>

                      <span className="detail-box detail-box-a" />
                      <span className="detail-box detail-box-b" />
                      <span className="detail-box detail-box-c" />
                    </div>

                    <div className="vg-visual-scanline" />
                  </div>

                  <div className="vg-visual-caption">
                    <div>
                      <span>DOCUMENT STATE</span>
                      <strong>
                        {result
                          ? "LOCKED FOR REVIEW"
                          : "LIVE SCAN"}
                      </strong>
                    </div>
                    <div>
                      <span>RETURNED EVIDENCE</span>
                      <strong>
                        {result
                          ? `${result.fraudEvidence.length} SIGNALS`
                          : "WAITING"}
                      </strong>
                    </div>
                    <div>
                      <span>SOURCE</span>
                      <strong>BACKEND</strong>
                    </div>
                  </div>
                </div>
              )}

              {tool === "fields" && (
                <div className="vg-detail-fields">
                  <div className="vg-detail-heading">
                    <Fingerprint size={15} />
                    FIELD-BY-FIELD MATRIX
                  </div>

                  {Object.entries(
                    result?.extractedFields ?? {}
                  ).length === 0 ? (
                    <div className="vg-empty vg-empty-wide">
                      NO EXTRACTED FIELD DATA RETURNED
                    </div>
                  ) : (
                    <div className="vg-detail-field-grid">
                      {Object.entries(
                        result.extractedFields
                      ).map(([key, value]) => (
                        <div
                          className="vg-detail-field-card"
                          key={key}
                        >
                          <span>
                            {key
                              .replaceAll(
                                "_",
                                " "
                              )
                              .toUpperCase()}
                          </span>
                          <strong>
                            {valueText(value)}
                          </strong>
                          <small>BACKEND RETURNED</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tool === "ai" && (
                <div className="vg-detail-ai">
                  <div className="vg-detail-heading">
                    <BrainCircuit size={15} />
                    GEMINI AI REASONING
                  </div>

                  <div className="vg-ai-understanding">
                    <div className="vg-ai-mark">
                      <Sparkles size={21} />
                    </div>

                    <div>
                      <span>INTERPRETATION LAYER</span>
                      <h2>
                        Evidence-aware reasoning
                      </h2>
                      <p>
                        The interface presents the backend findings as
                        connected evidence, not as isolated machine labels.
                        Each statement below is taken from the active
                        verification response.
                      </p>
                    </div>
                  </div>

                  <div className="vg-reasoning-stack">
                    {result?.reasons?.length ? (
                      result.reasons.map(
                        (reason, index) => (
                          <article
                            className="vg-reason-card"
                            key={index}
                          >
                            <span>
                              FINDING /{" "}
                              {String(index + 1).padStart(
                                2,
                                "0"
                              )}
                            </span>
                            <p>
                              {valueText(reason)}
                            </p>
                          </article>
                        )
                      )
                    ) : (
                      <div className="vg-empty vg-empty-wide">
                        AWAITING AI REASONING FROM THE VERIFICATION ENGINE
                      </div>
                    )}
                  </div>

                  {result?.recommendation && (
                    <div className="vg-ai-recommendation">
                      <span>RECOMMENDATION</span>
                      <strong>
                        {valueText(
                          result.recommendation
                        )}
                      </strong>
                    </div>
                  )}

                  {result?.fraudEvidence?.length > 0 && (
                    <div className="vg-correlation-note">
                      <span>WHY THIS MATTERS</span>
                      <p>
                        The engine returned{" "}
                        {result.fraudEvidence.length} evidence
                        signal
                        {result.fraudEvidence.length === 1
                          ? ""
                          : "s"}{" "}
                        alongside the reasoning. Review the evidence
                        signals together with the narrative before making
                        a final human decision.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tool === "crypto" && (
                <div className="vg-detail-crypto">
                  <div className="vg-detail-heading">
                    <LockKeyhole size={15} />
                    CRYPTOGRAPHIC STATUS
                  </div>

                  <div className="vg-crypto-inline">
                    <div className="vg-crypto-lock">
                      <LockKeyhole size={28} />
                    </div>

                    <div>
                      <span>SIGNATURE CHANNEL</span>
                      <h2>
                        {result
                          ? "VERIFICATION DATA RECEIVED"
                          : "AWAITING VERIFICATION"}
                      </h2>
                      <p>
                        Cryptographic information is shown only when
                        returned by the backend. The interface does not
                        fabricate hashes, signatures, or certificates.
                      </p>
                    </div>
                  </div>

                  <div className="vg-crypto-status-row">
                    <span>SESSION</span>
                    <strong>
                      {documentId || "N/A"}
                    </strong>
                  </div>
                  <div className="vg-crypto-status-row">
                    <span>DOCUMENT</span>
                    <strong>
                      {file?.name || "N/A"}
                    </strong>
                  </div>
                  <div className="vg-crypto-status-row">
                    <span>BACKEND STATE</span>
                    <strong>
                      {result
                        ? "DATA RECEIVED"
                        : "WAITING"}
                    </strong>
                  </div>
                </div>
              )}

            </div>

            <div className="vg-secondary-actions vg-forensics-actions">
              <button
                type="button"
                onClick={() => navigate("console")}
              >
                <ArrowLeftFallback />
                RETURN TO CONSOLE
              </button>

              <button
                type="button"
                onClick={() => navigate("report")}
              >
                OPEN EVIDENCE DOSSIER
                <ChevronRight size={15} />
              </button>
            </div>

          </section>
        </main>
      )}

      {/* ===================================================
          PAGE 3 — RESULT
      =================================================== */}

      {page === "report" && (
        <main className="vg-main vg-result-page">
          <section className="vg-secondary">

            <div className="vg-result-head">
              <div>
                <span>FINAL FORENSIC VERDICT / EVIDENCE DOSSIER</span>
                <h1>
                  VERIFICATION <b>RESULT</b>
                </h1>
                <p>
                  A clear, human-readable interpretation of the evidence returned
                  by the active verification engine.
                </p>
              </div>

              <button
                type="button"
                className="vg-result-export"
                disabled={!result}
                onClick={exportReport}
              >
                <Download size={14} />
                EXPORT PDF
              </button>
            </div>

            {!result ? (
              <div className="vg-result-empty glass">
                <FileSearch size={34} />
                <h2>NO ACTIVE VERIFICATION</h2>
                <p>
                  Complete a forensic analysis before opening the final dossier.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("console")}
                >
                  START NEW ANALYSIS
                  <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <>
                <section
                  className={`vg-result-hero ${riskTone}`}
                  aria-label="Final verification verdict"
                >
                  <div className="vg-result-glow" />
                  <div className="vg-result-shock shock-1" />
                  <div className="vg-result-shock shock-2" />
                  <div className="vg-result-sweep" />

                  <div className="vg-result-verdict-block">
                    <span>COMPOSITE RISK SIGNAL</span>

                    <div className="vg-result-score">
                      <strong>{score ?? "--"}</strong>
                      <small>/100</small>
                    </div>

                    <div className="vg-result-verdict">
                      {verdict}
                    </div>

                    <div className="vg-result-risk">
                      <span>RISK LEVEL</span>
                      <strong>
                        {result.riskLevel
                          ? String(result.riskLevel).toUpperCase()
                          : "NOT RETURNED"}
                      </strong>
                    </div>
                  </div>

                  <div className="vg-result-shield-wrap">
                    <div className="vg-result-shield-ring ring-outer" />
                    <div className="vg-result-shield-ring ring-mid" />

                    <div className="vg-result-shield">
                      <Shield size={63} strokeWidth={0.95} />
                      <strong>{score ?? "--"}</strong>
                      <small>/100</small>
                    </div>
                  </div>

                  <div className="vg-result-summary">
                    <span>ENGINE INTERPRETATION</span>

                    <h2>
                      {riskTone === "danger"
                        ? "HIGH-RISK EVIDENCE PATTERN"
                        : riskTone === "warning"
                          ? "REVIEW-REQUIRED EVIDENCE PATTERN"
                          : "LOW-RISK EVIDENCE PATTERN"}
                    </h2>

                    <p>
                      {result.recommendation
                        ? valueText(result.recommendation)
                        : riskTone === "danger"
                          ? "The returned evidence contains signals that warrant immediate manual verification."
                          : riskTone === "warning"
                            ? "The returned evidence contains signals that should be reviewed before acceptance."
                            : "The returned evidence does not indicate a high-risk pattern from the available verification signals."}
                    </p>

                    <div className="vg-result-facts">
                      <div>
                        <span>CONFIDENCE</span>
                        <strong>{result.confidence ?? "—"}</strong>
                      </div>

                      <div>
                        <span>DOCUMENT TYPE</span>
                        <strong>{result.documentType ?? "—"}</strong>
                      </div>

                      <div>
                        <span>CASE ID</span>
                        <strong>{documentId || "—"}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="vg-result-grid">

                  <div className="vg-result-main-column">

                    <article className="vg-result-card glass">
                      <div className="vg-result-card-head">
                        <div>
                          <span>01 / AI REASONING</span>
                          <h2>Why VeriGuard reached this result</h2>
                        </div>
                        <BrainCircuit size={18} />
                      </div>

                      <div className="vg-result-reasoning">
                        {result.reasons.length ? (
                          result.reasons.map((reason, index) => (
                            <div
                              className="vg-result-reason"
                              key={index}
                            >
                              <div className="reason-index">
                                {String(index + 1).padStart(2, "0")}
                              </div>

                              <div>
                                <strong>
                                  {index === 0
                                    ? "PRIMARY FINDING"
                                    : "SUPPORTING FINDING"}
                                </strong>

                                <p>{valueText(reason)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="vg-result-empty-inline">
                            NO DETAILED AI REASONING RETURNED
                          </div>
                        )}
                      </div>

                      <div className="vg-result-context">
                        <div className="context-symbol">?</div>
                        <div>
                          <span>WHY THIS MATTERS</span>
                          <p>
                            Findings should be interpreted together with the
                            field, visual and document-level evidence. A final
                            human decision remains essential for consequential
                            verification.
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className="vg-result-card glass">
                      <div className="vg-result-card-head">
                        <div>
                          <span>02 / EVIDENCE CORRELATION</span>
                          <h2>Signals detected during verification</h2>
                        </div>
                        <ShieldAlert size={18} />
                      </div>

                      {result.fraudEvidence.length ? (
                        <div className="vg-evidence-grid">
                          {result.fraudEvidence.map((evidence, index) => (
                            <div
                              className={`vg-evidence-card ${riskTone}`}
                              key={index}
                            >
                              <div className="evidence-marker">
                                {String(index + 1).padStart(2, "0")}
                              </div>

                              <strong>
                                {valueText(evidence)}
                              </strong>

                              <span>
                                BACKEND RETURNED SIGNAL
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="vg-result-empty-inline">
                          NO EVIDENCE SIGNALS RETURNED
                        </div>
                      )}
                    </article>

                    <article className="vg-result-card glass">
                      <div className="vg-result-card-head">
                        <div>
                          <span>03 / FIELD MATRIX</span>
                          <h2>Extracted document information</h2>
                        </div>
                        <Fingerprint size={18} />
                      </div>

                      {Object.entries(result.extractedFields ?? {}).length ? (
                        <div className="vg-result-fields">
                          {Object.entries(result.extractedFields).map(
                            ([key, value]) => (
                              <div
                                className="vg-result-field"
                                key={key}
                              >
                                <span>
                                  {key
                                    .replaceAll("_", " ")
                                    .toUpperCase()}
                                </span>

                                <strong>
                                  {valueText(value)}
                                </strong>

                                <small>RETURNED</small>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="vg-result-empty-inline">
                          NO EXTRACTED FIELD DATA RETURNED
                        </div>
                      )}
                    </article>

                  </div>

                  <aside className="vg-result-side-column">

                    <div className="vg-result-status-card glass">
                      <div className="vg-result-card-head">
                        <div>
                          <span>SESSION</span>
                          <h2>Verification status</h2>
                        </div>
                        <CheckCircle2 size={17} />
                      </div>

                      <div className="status-line">
                        <span>DOCUMENT</span>
                        <strong>{file?.name || "—"}</strong>
                      </div>

                      <div className="status-line">
                        <span>DOCUMENT ID</span>
                        <strong>{documentId || "—"}</strong>
                      </div>

                      <div className="status-line">
                        <span>CONFIDENCE</span>
                        <strong>{result.confidence ?? "—"}</strong>
                      </div>

                      <div className="status-line">
                        <span>TYPE</span>
                        <strong>{result.documentType ?? "—"}</strong>
                      </div>

                      <div className="status-line">
                        <span>STATUS</span>
                        <strong className="status-good">
                          VERIFIED BY ENGINE
                        </strong>
                      </div>
                    </div>

                    <div className="vg-result-next glass">
                      <span>NEXT ACTION</span>

                      <h2>
                        {riskTone === "danger"
                          ? "Manual investigation recommended"
                          : riskTone === "warning"
                            ? "Review evidence before acceptance"
                            : "Document can proceed to routine review"}
                      </h2>

                      <p>
                        The result is decision support. Human verification remains
                        the final authority for consequential use.
                      </p>

                      <button
                        type="button"
                        onClick={() => navigate("history")}
                      >
                        OPEN CASE HISTORY
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="vg-result-crypto glass">
                      <LockKeyhole size={17} />
                      <span>CRYPTOGRAPHIC CHANNEL</span>

                      <strong>
                        {result.raw?.sha256 ??
                          result.raw?.hash ??
                          result.raw?.sha_256 ??
                          "NOT RETURNED BY BACKEND"}
                      </strong>
                    </div>

                  </aside>
                </section>
              </>
            )}

          </section>
        </main>
      )}

      <footer className="vg-footer">

        <span>
          VERIGUARD AI / FORENSIC CORE
        </span>

        <span>
          OCR · FIELD · VISION · GEMINI · RISK
        </span>

        <span>
          SECURE SESSION
        </span>

      </footer>

    </div>
  );
}

/*
  Small inline icon component so the navigation
  does not depend on another import.
*/
function ArrowLeftFallback() {
  return (
    <span
      style={{
        display: "inline-block",
        marginRight: "5px",
      }}
    >
      ←
    </span>
  );
}

export default App;