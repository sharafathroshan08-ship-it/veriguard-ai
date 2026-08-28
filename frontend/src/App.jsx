import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  BrainCircuit,
  ChevronRight,
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

      /* Verify */
      setVerifying(true);

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

      /* Page 2 */
      setPage("forensics");
      setTool("telemetry");
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

            <div className="vg-console-meta">

              <span>
                FORENSIC COMMAND / INTAKE
              </span>

              <span>
                {documentId
                  ? `SESSION / ${documentId}`
                  : "SESSION / STANDBY"}
              </span>

            </div>

            <div className="vg-console-grid">

              {/* LEFT */}
              <aside className="vg-side vg-intake">

                <div className="vg-number">
                  01
                </div>

                <div className="vg-label">
                  EVIDENCE INTAKE
                </div>

                <h2>
                  DOCUMENT
                  <span>
                    INGESTION
                  </span>
                </h2>

                <p>
                  Introduce your evidence into
                  the forensic chamber and initialize
                  the verification sequence.
                </p>

                <label
                  className={
                    file
                      ? "vg-drop has-file"
                      : "vg-drop"
                  }
                  onDragOver={(event) =>
                    event.preventDefault()
                  }
                  onDrop={handleDrop}
                >

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={
                      handleFileInput
                    }
                  />

                  <div className="vg-upload-ring">

                    {file ? (
                      <FileCheck2
                        size={24}
                      />
                    ) : (
                      <CloudUpload
                        size={24}
                      />
                    )}

                  </div>

                  <strong>
                    {file
                      ? file.name
                      : "DROP DOCUMENT"}
                  </strong>

                  <span>
                    {file
                      ? "DOCUMENT READY FOR FORENSIC SCAN"
                      : "OR SELECT FILE TO INITIALIZE SCAN"}
                  </span>

                  <small>
                    PDF / PNG / JPG / JPEG
                  </small>

                </label>

                {file && (
                  <button
                    type="button"
                    className="vg-clear"
                    onClick={clearFile}
                  >
                    <X size={12} />
                    CLEAR DOCUMENT
                  </button>
                )}

                <div className="vg-intake-status">

                  <i />

                  {uploading
                    ? "UPLOADING EVIDENCE"
                    : verifying
                      ? "ANALYSIS IN PROGRESS"
                      : file
                        ? "EVIDENCE READY"
                        : "READY FOR INTAKE"}

                </div>

              </aside>

              {/* CENTER */}
              <section className="vg-chamber">

                <div className="vg-chamber-top">

                  <span>
                    SPATIAL FORENSIC CHAMBER
                  </span>

                  <span>
                    VG / CORE 01
                  </span>

                </div>

                <div className="vg-chamber-field">

                  <div className="vg-chamber-grid" />

                  <div className="vg-orbit vg-orbit-1" />
                  <div className="vg-orbit vg-orbit-2" />
                  <div className="vg-orbit vg-orbit-3" />

                  <div className="vg-cross vg-cross-x" />
                  <div className="vg-cross vg-cross-y" />

                  <div className="vg-particle p1" />
                  <div className="vg-particle p2" />
                  <div className="vg-particle p3" />
                  <div className="vg-particle p4" />

                  {!file ? (
                    <div className="vg-core-idle">

                      <div className="vg-core-icon">
                        <FileText
                          size={27}
                        />
                      </div>

                      <strong>
                        AWAITING EVIDENCE
                      </strong>

                      <span>
                        DROP DOCUMENT TO INITIALIZE
                      </span>

                    </div>
                  ) : (
                    <div
                      className={
                        verifying
                          ? "vg-hologram scanning"
                          : "vg-hologram"
                      }
                    >

                      <div className="vg-doc">

                        <div className="vg-doc-header">

                          <b>
                            VG
                          </b>

                          <div>
                            <i />
                            <i />
                          </div>

                        </div>

                        <div className="vg-doc-image" />

                        <div className="vg-doc-lines">
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>

                        <div className="vg-doc-stamp">
                          FORENSIC
                        </div>

                      </div>

                      <div className="vg-box vg-box-a" />
                      <div className="vg-box vg-box-b" />
                      <div className="vg-box vg-box-c" />

                    </div>
                  )}

                  <div
                    className={
                      verifying
                        ? "vg-scan-line fast"
                        : "vg-scan-line"
                    }
                  />

                  <span className="vg-coord vg-coord-a">
                    X / 084.22
                  </span>

                  <span className="vg-coord vg-coord-b">
                    Y / 291.07
                  </span>

                  <span className="vg-coord vg-coord-c">
                    VECTOR / 04
                  </span>

                  <div className="vg-core-state">

                    {verifying
                      ? PIPELINE[
                          pipelineStep
                        ]
                      : file
                        ? "DOCUMENT LOCKED"
                        : "FORENSIC CORE READY"}

                  </div>

                </div>

                <div className="vg-chamber-bottom">

                  <span>

                    {verifying
                      ? `${Math.round(
                          ((pipelineStep + 1) /
                            PIPELINE.length) *
                            100
                        )}% PROCESSING`
                      : result
                        ? "ANALYSIS COMPLETE"
                        : "NO PAYLOAD"}

                  </span>

                  <span>

                    {verifying
                      ? "SCAN MATRIX ACTIVE"
                      : "READY"}

                  </span>

                </div>

              </section>

              {/* RIGHT */}
              <aside className="vg-side vg-verdict">

                <div className="vg-number">
                  02
                </div>

                <div className="vg-label">
                  VERDICT PROJECTION
                </div>

                <div
                  className={`vg-shield ${
                    result ? riskTone : ""
                  }`}
                >

                  <Shield
                    size={41}
                    strokeWidth={1.15}
                  />

                  <strong>
                    {score ?? "--"}
                  </strong>

                  <small>
                    /100
                  </small>

                </div>

                <div
                  className={`vg-verdict-text ${
                    result ? riskTone : ""
                  }`}
                >
                  {verdict}
                </div>

                <div className="vg-verdict-caption">
                  {result?.riskLevel ??
                    "COMPOSITE RISK SIGNAL"}
                </div>

                <div className="vg-verdict-data">

                  <div>
                    <span>
                      CONFIDENCE
                    </span>

                    <strong>
                      {result?.confidence ??
                        "--"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      DOCUMENT TYPE
                    </span>

                    <strong>
                      {result?.documentType ??
                        "--"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      EVIDENCE
                    </span>

                    <strong>
                      {result
                        ? result
                            .fraudEvidence
                            .length
                        : "--"}
                    </strong>
                  </div>

                </div>

              </aside>

            </div>

            {error && (
              <div className="vg-error">

                <ShieldAlert size={14} />

                <span>
                  {error}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                >
                  <X size={13} />
                </button>

              </div>
            )}

            <button
              type="button"
              className="vg-primary"
              disabled={
                !file ||
                uploading ||
                verifying
              }
              onClick={runAnalysis}
            >

              <span>

                {uploading
                  ? "UPLOADING EVIDENCE..."
                  : verifying
                    ? "FORENSIC ENGINE PROCESSING..."
                    : "INITIATE FORENSIC ANALYSIS"}

              </span>

              <ChevronRight size={18} />

            </button>

            <section className="vg-engine">

              <div className="vg-engine-title">

                <span>
                  FORENSIC ENGINE
                </span>

                <small>
                  MULTIMODAL PIPELINE
                </small>

              </div>

              {[
                ["OCR", "OPTICAL"],
                ["FIELDS", "VALIDATION"],
                ["VISION", "VISUAL"],
                ["GEMINI", "INTELLIGENCE"],
                ["RISK", "SYNTHESIS"],
              ].map(
                ([name, subtitle], index) => (
                  <div
                    key={name}
                    className={
                      verifying &&
                      index <= pipelineStep
                        ? "active"
                        : result
                          ? "complete"
                          : ""
                    }
                  >

                    <strong>
                      {name}
                    </strong>

                    <span>
                      {subtitle}
                    </span>

                    <small>

                      {verifying &&
                      index === pipelineStep
                        ? "ACTIVE"
                        : result
                          ? "COMPLETE"
                          : index === 3
                            ? "ARMED"
                            : "READY"}

                    </small>

                  </div>
                )
              )}

            </section>

          </section>

        </main>
      )}

      {/* ===================================================
          PAGE 2 — FORENSICS
      =================================================== */}

      {page === "forensics" && (
        <main className="vg-main">

          <section className="vg-secondary">

            <div className="vg-secondary-head">

              <div>

                <span>
                  ACTIVE FORENSIC SESSION
                </span>

                <h1>
                  FORENSIC
                  <b>
                    ANALYSIS
                  </b>
                </h1>

              </div>

              <div className="vg-session">

                <i />

                {verifying
                  ? "PROCESSING"
                  : result
                    ? "ANALYSIS COMPLETE"
                    : "STANDBY"}

              </div>

            </div>

            <div className="vg-tools">

              {[
                [
                  "telemetry",
                  "LIVE TELEMETRY",
                ],
                [
                  "visual",
                  "VISUAL FORENSICS",
                ],
                [
                  "fields",
                  "FIELD MATRIX",
                ],
                [
                  "ai",
                  "AI REASONING",
                ],
                [
                  "crypto",
                  "CRYPTOGRAPHIC STATUS",
                ],
              ].map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={
                      tool === key
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setTool(key)
                    }
                  >
                    {label}
                  </button>
                )
              )}

            </div>

            <div className="vg-tool-panel">

              {/* TELEMETRY */}

              {tool === "telemetry" && (
                <div className="vg-telemetry-view">

                  <div className="vg-tool-title">
                    <Activity size={15} />
                    LIVE TELEMETRY
                  </div>

                  <div className="vg-event-list">

                    {PIPELINE.map(
                      (step, index) => (
                        <div
                          key={step}
                          className={
                            verifying &&
                            index ===
                              pipelineStep
                              ? "vg-event active"
                              : result &&
                                  index <=
                                    pipelineStep
                                ? "vg-event complete"
                                : "vg-event"
                          }
                        >

                          <span>
                            {clock}
                          </span>

                          <b>
                            {verifying &&
                            index ===
                              pipelineStep
                              ? "SCAN"
                              : result &&
                                  index <=
                                    pipelineStep
                                ? "PASS"
                                : "WAIT"}
                          </b>

                          <strong>
                            {step}
                          </strong>

                          <small>
                            {verifying &&
                            index ===
                              pipelineStep
                              ? "ACTIVE"
                              : result &&
                                  index <=
                                    pipelineStep
                                ? "COMPLETE"
                                : "STANDBY"}
                          </small>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

              {/* VISUAL */}

              {tool === "visual" && (
                <div className="vg-visual-view">

                  <div className="vg-tool-title">
                    <ScanLine size={15} />
                    VISUAL FORENSICS
                  </div>

                  <div className="vg-visual-stage">

                    <div className="vg-visual-doc">

                      <div className="vg-visual-photo" />

                      <i />
                      <i />
                      <i />
                      <i />

                      <span className="vbox vbox-a" />
                      <span className="vbox vbox-b" />
                      <span className="vbox vbox-c" />

                    </div>

                    <div className="vg-visual-beam" />

                  </div>

                </div>
              )}

              {/* FIELDS */}

              {tool === "fields" && (
                <div className="vg-fields-view">

                  <div className="vg-tool-title">
                    <Fingerprint size={15} />
                    FIELD-BY-FIELD MATRIX
                  </div>

                  <div className="vg-fields-grid">

                    {Object.entries(
                      result?.extractedFields ??
                        {}
                    ).length === 0 ? (
                      <div className="vg-empty">
                        NO EXTRACTED FIELD DATA
                      </div>
                    ) : (
                      Object.entries(
                        result.extractedFields
                      ).map(
                        ([key, value]) => (
                          <div
                            className="vg-field-card"
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
                              {valueText(
                                value
                              )}
                            </strong>

                            <small>
                              FIELD RETURNED
                            </small>

                          </div>
                        )
                      )
                    )}

                  </div>

                </div>
              )}

              {/* AI */}

              {tool === "ai" && (
                <div className="vg-ai-view">

                  <div className="vg-tool-title">
                    <BrainCircuit size={15} />
                    GEMINI AI REASONING
                  </div>

                  <div className="vg-ai-card">

                    <div className="vg-ai-orb">
                      <Sparkles size={24} />
                    </div>

                    <h2>
                      Multimodal reasoning
                    </h2>

                    <div className="vg-reasoning">

                      {result?.reasons?.length ? (
                        result.reasons.map(
                          (reason, index) => (
                            <p
                              key={index}
                            >
                              {valueText(
                                reason
                              )}
                            </p>
                          )
                        )
                      ) : (
                        <p>
                          Awaiting AI reasoning
                          from the verification
                          engine.
                        </p>
                      )}

                    </div>

                  </div>

                </div>
              )}

              {/* CRYPTO */}

              {tool === "crypto" && (
                <div className="vg-crypto-view">

                  <div className="vg-tool-title">
                    <LockKeyhole size={15} />
                    CRYPTOGRAPHIC STATUS
                  </div>

                  <div className="vg-crypto-core">

                    <div>
                      <LockKeyhole
                        size={32}
                      />
                    </div>

                    <h2>
                      SIGNATURE CHANNEL
                    </h2>

                    <strong>
                      {result
                        ? "VERIFICATION DATA RECEIVED"
                        : "AWAITING VERIFICATION"}
                    </strong>

                    <p>
                      Cryptographic verification
                      information returned by the
                      backend will appear here.
                    </p>

                  </div>

                </div>
              )}

            </div>

            <div className="vg-secondary-actions">

              <button
                type="button"
                onClick={() =>
                  navigate("console")
                }
              >
                <span>
                  <ArrowLeftFallback />
                  RETURN TO CONSOLE
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("report")
                }
              >
                OPEN EVIDENCE DOSSIER
                <ChevronRight size={15} />
              </button>

            </div>

          </section>

        </main>
      )}

      {/* ===================================================
          PAGE 4 — HISTORY
      =================================================== */}

      {page === "history" && (
        <main className="vg-main">

          <section className="vg-secondary">

            <div className="vg-secondary-head">

              <div>

                <span>
                  VERIFICATION ARCHIVE
                </span>

                <h1>
                  CASE
                  <b>
                    HISTORY
                  </b>
                </h1>

              </div>

              <div className="vg-history-search">

                <Search size={14} />

                <input
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="SEARCH CASES"
                />

              </div>

            </div>

            <div className="vg-history-actions">

              <button
                type="button"
                onClick={loadHistory}
              >
                <RefreshCw size={13} />
                REFRESH
              </button>

            </div>

            <div className="vg-history-grid">

              {historyLoading ? (
                <div className="vg-empty full">
                  LOADING VERIFICATION ARCHIVE...
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="vg-empty full">
                  NO VERIFICATION RECORDS FOUND
                </div>
              ) : (
                filteredHistory.map(
                  (item, index) => {

                    const normalized =
                      normalizeResult(
                        item
                      );

                    const itemId =
                      firstValue(
                        item?.document_id,
                        item?.documentId,
                        item?.id,
                        `SESSION-${index + 1}`
                      );

                    const itemName =
                      firstValue(
                        item?.file_name,
                        item?.filename,
                        item?.name,
                        "Verification"
                      );

                    return (
                      <article
                        className="vg-history-card"
                        key={String(itemId)}
                      >

                        <div className="vg-history-top">

                          <span>
                            {itemId}
                          </span>

                          <History size={14} />

                        </div>

                        <div className="vg-history-icon">
                          <FileCheck2
                            size={20}
                          />
                        </div>

                        <h2>
                          {itemName}
                        </h2>

                        <p>
                          {normalized.documentType ??
                            "FORENSIC VERIFICATION SESSION"}
                        </p>

                        <div className="vg-history-score">

                          <span>
                            RISK SCORE
                          </span>

                          <strong>
                            {normalized.score ??
                              "--"}

                            <small>
                              /100
                            </small>

                          </strong>

                        </div>

                        <div
                          className={`vg-history-verdict ${
                            getRiskTone(
                              normalized.score,
                              normalized.riskLevel
                            )
                          }`}
                        >
                          {getVerdict(
                            normalized.decision,
                            normalized.score
                          )}
                        </div>

                      </article>
                    );
                  }
                )
              )}

            </div>

          </section>

        </main>
      )}

      {/* ===================================================
          PAGE 3 — RESULT
      =================================================== */}

      {page === "report" && (
        <main className="vg-main">

          <section className="vg-secondary">

            <div className="vg-secondary-head">

              <div>

                <span>
                  FINAL VERIFICATION RESULT
                </span>

                <h1>
                  VERIFICATION
                  <b>
                    RESULT
                  </b>
                </h1>

              </div>

              <button
                type="button"
                className="vg-download"
                disabled={!result}
                onClick={exportReport}
              >
                <Download size={14} />
                EXPORT PDF
              </button>

            </div>

            {!result ? (
              <div className="vg-report-empty">

                <FileSearch size={32} />

                <h2>
                  NO ACTIVE REPORT
                </h2>

                <p>
                  Complete a forensic verification
                  before opening the evidence dossier.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("console")
                  }
                >
                  START NEW ANALYSIS
                  <ChevronRight size={15} />
                </button>

              </div>
            ) : (
              <div className="vg-report">

                <aside className="vg-report-verdict">

                  <span className="report-kicker">
                    CURRENT VERDICT
                  </span>

                  <div className={`report-score ${riskTone}`}>
                    <strong>
                      {score ?? "--"}
                    </strong>
                    <small>/100</small>
                  </div>

                  <div className={`report-verdict-text ${riskTone}`}>
                    {verdict}
                  </div>

                  <div className="report-risk-box">
                    <span>RISK LEVEL</span>
                    <strong>
                      {result.riskLevel ?? "NOT RETURNED"}
                    </strong>
                  </div>

                </aside>

                <section className="vg-report-center">

                  <article className="vg-report-card">

                    <div className="vg-report-card-title">

                      <span>
                        GEMINI AI ANALYSIS
                      </span>

                      <BrainCircuit
                        size={16}
                      />

                    </div>

                    <div className="vg-report-copy">

                      {result.reasons.length ? (
                        result.reasons.map(
                          (
                            reason,
                            index
                          ) => (
                            <p
                              key={index}
                            >
                              {valueText(
                                reason
                              )}
                            </p>
                          )
                        )
                      ) : (
                        <p>
                          No detailed reasoning
                          was returned.
                        </p>
                      )}

                    </div>

                    {result.recommendation && (
                      <div className="vg-recommendation">

                        <span>
                          RECOMMENDATION
                        </span>

                        <strong>
                          {valueText(
                            result.recommendation
                          )}
                        </strong>

                      </div>
                    )}

                  </article>

                  <article className="vg-report-card">

                    <div className="vg-report-card-title">

                      <span>
                        FIELD-BY-FIELD MATRIX
                      </span>

                      <Fingerprint
                        size={16}
                      />

                    </div>

                    <div className="vg-report-fields">

                      {Object.entries(
                        result.extractedFields ??
                          {}
                      ).length === 0 ? (
                        <div className="vg-empty">
                          NO FIELD DATA
                        </div>
                      ) : (
                        Object.entries(
                          result.extractedFields
                        ).map(
                          ([key, value]) => (
                            <div
                              className="vg-report-field"
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
                                {valueText(
                                  value
                                )}
                              </strong>

                              <small>
                                RETURNED
                              </small>

                            </div>
                          )
                        )
                      )}

                    </div>

                  </article>

                  <article className="vg-report-card">

                    <div className="vg-report-card-title">

                      <span>
                        EVIDENCE SIGNALS
                      </span>

                      <ShieldAlert
                        size={16}
                      />

                    </div>

                    {result.fraudEvidence.length ===
                    0 ? (
                      <div className="vg-empty">
                        NO FRAUD EVIDENCE RETURNED
                      </div>
                    ) : (
                      <div className="vg-evidence-list">

                        {result.fraudEvidence.map(
                          (
                            evidence,
                            index
                          ) => (
                            <div
                              key={index}
                            >
                              <strong>
                                {valueText(
                                  evidence
                                )}
                              </strong>
                            </div>
                          )
                        )}

                      </div>
                    )}

                  </article>

                </section>

                <aside className="vg-report-meta">

                  <div className="vg-report-meta-icon">
                    <LockKeyhole
                      size={21}
                    />
                  </div>

                  <span>
                    DOCUMENT ID
                  </span>

                  <strong>
                    {documentId || "--"}
                  </strong>

                  <span>
                    CONFIDENCE
                  </span>

                  <strong>
                    {result.confidence ??
                      "--"}
                  </strong>

                  <span>
                    DOCUMENT TYPE
                  </span>

                  <strong>
                    {result.documentType ??
                      "--"}
                  </strong>

                  <span>
                    ANALYSIS STATUS
                  </span>

                  <strong>
                    COMPLETE
                  </strong>

                </aside>

              </div>
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