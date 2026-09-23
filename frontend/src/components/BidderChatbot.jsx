import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Download, Search, 
  FileText, CheckCircle, AlertTriangle, ShieldCheck, Sparkles,
  HelpCircle, RefreshCw, ChevronRight, ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import gemBotImg from '../assets/gem-bot.png';

// Built-in historical archive of previous and active tenders for comprehensive retrieval
const ARCHIVED_TENDERS = [
  {
    id: 101,
    tenderNumber: 'GEM/2026/B/99201',
    title: 'Supply & Integration of National Cloud Computing Infrastructure',
    department: 'Ministry of Electronics & IT (MeitY)',
    category: 'Cloud Infrastructure & IT Services',
    estimatedValue: 50000000.00,
    minTurnover: 20000000.00,
    minExperienceYears: 5.0,
    requiredCerts: ['ISO-9001', 'ISO-27001'],
    submissionDeadline: '2026-10-15 17:00',
    status: 'ACTIVE',
    scope: 'Establishment of multi-region high-availability private cloud nodes, sovereign data containment, and automated failover orchestration.',
    emdAmount: '₹ 10,00,000 (Exempted for MSE/Startups)'
  },
  {
    id: 102,
    tenderNumber: 'GEM/2025/B/88104',
    title: 'Design, Supply and Deployment of AI-Powered CCTV Video Analytics',
    department: 'Ministry of Railways (RailTel)',
    category: 'Surveillance & Security Systems',
    estimatedValue: 35000000.00,
    minTurnover: 15000000.00,
    minExperienceYears: 3.0,
    requiredCerts: ['ISO-9001', 'CMMI-Level-3/5'],
    submissionDeadline: '2025-11-30 15:00',
    status: 'CLOSED',
    scope: 'Deployment of 1,200 edge AI IP cameras with automated intrusion detection, crowd density heatmap analysis, and centralized VMS integration.',
    emdAmount: '₹ 7,00,000'
  },
  {
    id: 103,
    tenderNumber: 'GEM/2024/B/77022',
    title: 'Procurement of High-Performance Enterprise Rack Servers and SAN Storage',
    department: 'Ministry of Defence (DRDO)',
    category: 'Computer Hardware & Storage',
    estimatedValue: 80000000.00,
    minTurnover: 40000000.00,
    minExperienceYears: 7.0,
    requiredCerts: ['ISO-9001', 'ISO-27001', 'ISO-14001'],
    submissionDeadline: '2024-08-20 18:00',
    status: 'CLOSED',
    scope: 'Turnkey delivery of 48-node clustered enterprise servers, NVMe-oF all-flash SAN array, redundant 100GbE switching fabric, and 5-year 24x7 mission-critical OEM warranty.',
    emdAmount: '₹ 16,00,000'
  },
  {
    id: 104,
    tenderNumber: 'GEM/2024/B/66190',
    title: 'Solar Photovoltaic Rooftop Power Grid Installation (500 kWp)',
    department: 'Ministry of New & Renewable Energy (MNRE)',
    category: 'Renewable Energy Equipment',
    estimatedValue: 24000000.00,
    minTurnover: 10000000.00,
    minExperienceYears: 4.0,
    requiredCerts: ['ISO-9001', 'ISO-14001', 'IEC-61215'],
    submissionDeadline: '2024-04-10 16:00',
    status: 'CLOSED',
    scope: 'Design, supply, installation, testing, and commissioning of grid-interactive rooftop solar PV plants across government administrative buildings.',
    emdAmount: '₹ 4,80,000'
  }
];

// Helper to parse markdown formatting, newlines, bullet lists, headers, and tables into cleanly separated new lines and responsive tables
const renderStructuredMessage = (rawText, isUser = false) => {
  if (!rawText) return null;

  // Normalize line breaks and replace <br> tags with newline
  const normalized = String(rawText)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n/g, '\n');

  const lines = normalized.split('\n');
  const elements = [];
  let currentTable = null;

  const renderInlineFormatted = (str, keyPrefix = '') => {
    if (!str) return null;
    const cleanStr = String(str).replace(/<br\s*\/?>/gi, '\n');
    const subParts = cleanStr.split('\n');

    return subParts.map((sub, sIdx) => {
      // Parse bold segments (**...** or ***...***), and completely strip all '*' characters
      const tokens = [];
      const boldRegex = /\*{2,3}(.*?)\*{2,3}/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(sub)) !== null) {
        if (match.index > lastIndex) {
          const plainText = sub.substring(lastIndex, match.index).replace(/\*/g, '');
          if (plainText) {
            tokens.push({ type: 'text', content: plainText });
          }
        }
        const boldContent = match[1].replace(/\*/g, '');
        if (boldContent) {
          tokens.push({ type: 'bold', content: boldContent });
        }
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < sub.length) {
        const remaining = sub.substring(lastIndex).replace(/\*/g, '');
        if (remaining) {
          tokens.push({ type: 'text', content: remaining });
        }
      }

      if (tokens.length === 0) {
        const cleaned = sub.replace(/\*/g, '');
        if (cleaned) {
          tokens.push({ type: 'text', content: cleaned });
        }
      }

      return (
        <React.Fragment key={`${keyPrefix}-sub-${sIdx}`}>
          {sIdx > 0 && <div style={{ height: '3px' }} />}
          {tokens.map((tok, tIdx) => {
            if (tok.type === 'bold') {
              return (
                <strong
                  key={`${keyPrefix}-s${sIdx}-b${tIdx}`}
                  style={{ color: isUser ? '#fde047' : '#0b3d62', fontWeight: '700' }}
                >
                  {tok.content}
                </strong>
              );
            }
            return <span key={`${keyPrefix}-s${sIdx}-t${tIdx}`}>{tok.content}</span>;
          })}
        </React.Fragment>
      );
    });
  };

  const flushTable = (tableData, key) => {
    if (!tableData || tableData.rows.length === 0) return null;
    const { headers, rows } = tableData;
    return (
      <div
        key={`tbl-${key}`}
        style={{
          margin: '10px 0',
          overflowX: 'auto',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          maxWidth: '100%'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left', minWidth: '320px' }}>
          {headers && headers.length > 0 && (
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                {headers.map((h, i) => (
                  <th key={`th-${i}`} style={{ padding: '7px 10px', fontWeight: '700', color: '#0b3d62' }}>
                    {renderInlineFormatted(h, `th-${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={`tr-${rIdx}`}
                style={{
                  borderBottom: '1px solid #e2e8f0',
                  background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'
                }}
              >
                {row.map((cell, cIdx) => (
                  <td key={`td-${cIdx}`} style={{ padding: '7px 10px', color: '#334155', verticalAlign: 'top', lineHeight: '1.45' }}>
                    {renderInlineFormatted(cell, `td-${rIdx}-${cIdx}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for Markdown Table row (e.g. | Step | What to Do | ... |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 3) {
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());

      // Check if it's separator line |---|---|
      const isSeparator = cells.every(c => /^[-:\s]+$/.test(c));

      if (isSeparator) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      elements.push(flushTable(currentTable, i));
      currentTable = null;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
      );
      continue;
    }

    // Markdown Headers: #, ##, ###
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,4})\s*(.*)$/);
      if (match) {
        const textContent = match[2];
        elements.push(
          <div
            key={`h-${i}`}
            style={{
              fontWeight: '700',
              fontSize: match[1].length <= 2 ? '14px' : '13px',
              color: isUser ? '#fde047' : '#0b3d62',
              marginTop: i > 0 ? '8px' : '2px',
              marginBottom: '4px',
              lineHeight: '1.4'
            }}
          >
            {renderInlineFormatted(textContent, `h-${i}`)}
          </div>
        );
        continue;
      }
    }

    // Bullet points / numbered lists: -, *, •, 1., 2.
    const bulletMatch = trimmed.match(/^([-*•]|\d+\.|\d+️⃣)\s*(.*)$/);
    if (bulletMatch) {
      elements.push(
        <div
          key={`bullet-${i}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            margin: '4px 0',
            lineHeight: '1.45'
          }}
        >
          <span style={{ color: isUser ? '#fde047' : '#0b3d62', fontWeight: '700', minWidth: '14px', flexShrink: 0 }}>
            {bulletMatch[1] === '-' || bulletMatch[1] === '*' ? '•' : bulletMatch[1]}
          </span>
          <div style={{ flex: 1 }}>
            {renderInlineFormatted(bulletMatch[2], `bitem-${i}`)}
          </div>
        </div>
      );
      continue;
    }

    // Empty line / paragraph break
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} style={{ height: '6px' }} />);
      continue;
    }

    // Regular line / sentence on its own line
    elements.push(
      <div key={`line-${i}`} style={{ margin: '3px 0', lineHeight: '1.5' }}>
        {renderInlineFormatted(trimmed, `p-${i}`)}
      </div>
    );
  }

  if (currentTable) {
    elements.push(flushTable(currentTable, 'end'));
  }

  return <div style={{ display: 'flex', flexDirection: 'column' }}>{elements}</div>;
};

export const BidderChatbot = ({ user, activeTenders = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Dynamic Draggable Position State for Robot Button
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(16, window.innerWidth - 115),
        y: Math.max(16, window.innerHeight - 150)
      };
    }
    return { x: 100, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false
  });

  // Handle pointer drag (works for mouse and touch)
  const handlePointerDown = (e) => {
    if (e.button !== 0) return; // Only primary mouse button
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false
    };
    setIsDragging(true);

    const onPointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      if (Math.hypot(dx, dy) > 5) {
        dragRef.current.hasMoved = true;
      }
      const maxX = Math.max(10, window.innerWidth - 95);
      const maxY = Math.max(10, window.innerHeight - 125);
      const newX = Math.min(Math.max(10, dragRef.current.initialX + dx), maxX);
      const newY = Math.min(Math.max(10, dragRef.current.initialY + dy), maxY);
      setPosition({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      // If user tapped/clicked without dragging, toggle chat
      if (!dragRef.current.hasMoved) {
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Adjust robot position on window resize so it never goes off-screen
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const maxX = Math.max(10, window.innerWidth - 95);
        const maxY = Math.max(10, window.innerHeight - 125);
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Combine live tenders with archived reference tenders
  const allTenders = React.useMemo(() => {
    const combined = [...ARCHIVED_TENDERS];
    activeTenders.forEach(at => {
      const idx = combined.findIndex(t => t.tenderNumber === at.tenderNumber || t.id === at.id);
      let certs = [];
      try {
        certs = at.requiredCertsJson ? (typeof at.requiredCertsJson === 'string' ? JSON.parse(at.requiredCertsJson) : at.requiredCertsJson) : [];
      } catch (e) {
        certs = ['ISO-9001'];
      }
      const formatted = {
        id: at.id,
        tenderNumber: at.tenderNumber || `GEM/2026/B/${at.id}`,
        title: at.title,
        department: at.department,
        category: at.category,
        estimatedValue: Number(at.estimatedValue) || 10000000,
        minTurnover: Number(at.minTurnover) || 5000000,
        minExperienceYears: Number(at.minExperienceYears) || 3,
        requiredCerts: certs,
        submissionDeadline: at.submissionDeadline || '2026-10-31 17:00',
        status: at.status || 'ACTIVE',
        scope: at.scope || 'Procurement scope and technical specification as outlined in the GeM schedule.',
        emdAmount: 'Refer to bid schedule'
      };
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], ...formatted };
      } else {
        combined.unshift(formatted);
      }
    });
    return combined;
  }, [activeTenders]);

  // Initial welcome message
  useEffect(() => {
    const orgName = user?.organizationName || user?.username || 'Valued Bidder';
    setMessages([
      {
        id: 1,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Namaste, **${orgName}**! I am **GeM Sahayak**, your automated Procurement AI Assistant.`,
        details: 'I can guide you through the step-by-step tender application procedure, verify document guidelines, or retrieve any previous/active tender and **convert its full specifications into an official downloadable PDF document**.',
        suggestions: [
          '📌 Steps to apply for a tender',
          '🔍 Search previous tenders',
          '📄 CA Turnover certificate rules',
          '🛡️ How does ELA fraud detection work?',
          '⚖️ How to submit an appeal / clarification'
        ]
      }
    ]);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Format currency in Indian format
  const formatINR = (val) => {
    if (!val && val !== 0) return '₹ 0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Convert Tender Details into an Official Downloadable PDF Document using jsPDF
  const generateTenderDocument = (tender) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [11, 61, 98]; // GeM Navy #0b3d62
      const secondaryColor = [224, 86, 36]; // GeM Saffron #e05624
      const darkColor = [30, 41, 59];
      const lightBg = [248, 250, 252];

      // Top Government / GeM Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 28, 'F');

      // Top Accent Line
      doc.setFillColor(...secondaryColor);
      doc.rect(0, 28, 210, 2.5, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('GOVERNMENT e-MARKETPLACE (GeM) | भारत सरकार', 105, 12, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL TENDER SPECIFICATION & COMPLIANCE DOSSIER', 105, 19, { align: 'center' });
      doc.text('Automated Compliance & Verification Platform (SIH Problem Statement 26100)', 105, 24, { align: 'center' });

      let y = 38;

      // Tender Title Box
      doc.setFillColor(...lightBg);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y, 182, 28, 2, 2, 'FD');

      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(tender.title || 'Government Procurement Tender', 174);
      doc.text(titleLines, 18, y + 7);

      y += 18;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tender Reference No: `, 18, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(tender.tenderNumber, 54, y);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: `, 125, y);
      const isClosed = tender.status === 'CLOSED';
      doc.setTextColor(isClosed ? 185 : 22, isClosed ? 28 : 101, isClosed ? 28 : 52);
      doc.setFont('helvetica', 'bold');
      doc.text(tender.status || 'ACTIVE', 140, y);

      y += 18;

      // Section 1: Administrative & Department Particulars
      doc.setFillColor(...primaryColor);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('1. ADMINISTRATIVE & CONTRACT SUMMARY', 18, y + 5);

      y += 10;
      doc.setTextColor(...darkColor);
      doc.setFontSize(9);

      const adminData = [
        ['Sponsoring Department / Ministry', tender.department || 'Government of India'],
        ['Procurement Category', tender.category || 'Goods & Services'],
        ['Estimated Contract Value', formatINR(tender.estimatedValue)],
        ['Submission / Closing Deadline', tender.submissionDeadline || 'As per portal schedule'],
        ['Earnest Money Deposit (EMD)', tender.emdAmount || 'Exempt for MSEs under Rule 170 of GFR']
      ];

      adminData.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', 18, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 80, y);
        y += 6;
      });

      y += 3;

      // Section 2: Mandatory Eligibility Criteria (Drools Rule Matrix)
      doc.setFillColor(...primaryColor);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('2. MANDATORY ELIGIBILITY CRITERIA (EVALUATED BY DROOLS ENGINE)', 18, y + 5);

      y += 11;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'FD');

      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Evaluation Parameter', 18, y + 4.5);
      doc.text('Mandatory Minimum Threshold', 80, y + 4.5);
      doc.text('Verification Mechanism', 140, y + 4.5);

      y += 7;
      const criteriaRows = [
        ['Annual Turnover', formatINR(tender.minTurnover), 'CA Audited P&L + OCR NLP Repair'],
        ['Past Commercial Experience', `${tender.minExperienceYears || 0} Years in similar scope`, 'Client Work Orders / Completion Certs'],
        ['Statutory Identity (PAN / GSTIN)', 'Active & Valid on NSDL / GSTN', 'Simulated Live Registry Webhook'],
        ['Quality & Security Standards', (tender.requiredCerts || []).join(', ') || 'ISO-9001', 'Certificate Tamper & Duplicate Hash']
      ];

      doc.setFont('helvetica', 'normal');
      criteriaRows.forEach(([param, thresh, mech], i) => {
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 6.5, 'F');
        }
        doc.setTextColor(...darkColor);
        doc.text(param, 18, y + 4.5);
        doc.text(thresh, 80, y + 4.5);
        doc.text(mech, 140, y + 4.5);
        y += 6.5;
      });

      y += 4;

      // Section 3: Scope of Work / Technical Specifications
      doc.setFillColor(...primaryColor);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('3. TECHNICAL SCOPE & DELIVERABLES', 18, y + 5);

      y += 10;
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const scopeLines = doc.splitTextToSize(tender.scope || 'Full turnkey deployment in compliance with GFR 2017 standards, SLA uptime guarantees of 99.9%, and comprehensive defect liability.', 176);
      doc.text(scopeLines, 18, y);
      y += (scopeLines.length * 4.5) + 3;

      // Section 4: Mandatory Document Checklist & AI Tamper Warning
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      doc.roundedRect(14, y, 182, 28, 2, 2, 'FD');

      doc.setTextColor(153, 27, 27);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('⚠️ MANDATORY COMPLIANCE & FRAUD DETECTION NOTICE (GFR RULE 151)', 18, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(69, 10, 10);
      const warningText = 'All uploaded documents undergo automated Error Level Analysis (ELA) for digital editing/text alteration and SHA-256 perceptual duplicate hashing against cross-bidder collusion. Any falsified turnover certificate, edited seal/signature, or blacklisted PAN will result in immediate disqualification and statutory debarment.';
      const warnLines = doc.splitTextToSize(warningText, 174);
      doc.text(warnLines, 18, y + 12);

      y += 33;

      // Section 5: Bidder Action Checklist
      doc.setFillColor(...primaryColor);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('4. BIDDER APPLICATION CHECKLIST', 18, y + 5);

      y += 10;
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const checklist = [
        '1. Ensure Active PAN and GSTIN match the legal registered entity name.',
        '2. Upload original, unedited CA Turnover Certificate with visible UDIN number.',
        '3. Attach verifiable Client Work Orders for declared experience years.',
        '4. Submit bid before deadline; track AI compliance score on the Bidder Cockpit.'
      ];
      checklist.forEach(item => {
        doc.text(item, 18, y);
        y += 5;
      });

      // Footer
      doc.setDrawColor(203, 213, 225);
      doc.line(14, 282, 196, 282);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated automatically by GeM Compliance Verification Engine | Tender: ${tender.tenderNumber}`, 14, 287);
      doc.text(`Doc Ref: SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()} | Page 1 of 1`, 196, 287, { align: 'right' });

      // Save PDF file
      const safeNumber = tender.tenderNumber.replace(/[\/\\:]/g, '_');
      const filename = `GeM_Tender_${safeNumber}_Dossier.pdf`;
      doc.save(filename);

      // Append confirmation in chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `📄 **Official Tender Specification Document Generated!**`,
          details: `The complete official dossier for tender **${tender.tenderNumber}** (*${tender.title}*) has been converted into an official Government of India PDF format and downloaded to your computer as **${filename}**.`,
          tenderCard: tender
        }
      ]);
    } catch (err) {
      console.error('Error generating tender PDF:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ **Unable to generate PDF document:** ${err.message}`
        }
      ]);
    }
  };

  // Chat message submission handler with RAG Engine
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const displayName = user?.organizationName || user?.username || 'Valued Bidder';

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      timestamp,
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Call FastAPI RAG Microservice
    try {
      const recentHistory = messages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const payload = {
        query,
        user_info: {
          username: user?.username,
          organizationName: user?.organizationName || user?.username,
          role: user?.role
        },
        active_tenders: allTenders,
        history: recentHistory
      };

      let resData = null;
      try {
        const res = await axios.post('/ai-api/api/ai/chat/query', payload, { timeout: 15000 });
        resData = res.data;
      } catch (proxyErr) {
        try {
          const resDirect = await axios.post('http://localhost:8000/api/ai/chat/query', payload, { timeout: 15000 });
          resData = resDirect.data;
        } catch (directErr) {
          console.warn('[RAG Chatbot] Microservice unreachable, falling back to local engine:', directErr);
        }
      }

      if (resData) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: resData.response_text,
            details: resData.details,
            steps: resData.steps,
            points: resData.points,
            tenderList: resData.tender_list || resData.tenderList,
            suggestions: resData.suggestions,
            retrievedContext: resData.retrieved_context,
            isRAG: true
          }
        ]);
        setIsTyping(false);
        return;
      }
    } catch (apiErr) {
      console.error('[RAG Chatbot] Exception calling RAG endpoint:', apiErr);
    }

    // High-Fidelity Local Semantic & Conversational Fallback
    processLocalQuery(query, displayName);
    setIsTyping(false);
  };

  // Local Conversational & Semantic RAG Fallback
  const processLocalQuery = (rawQuery, displayName) => {
    const q = rawQuery.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Conversational Greeting (Hi, Hello, Namaste, etc.)
    const greetingRegex = /^(hi|hello|hey|namaste|greetings|hola|good\s+morning|good\s+evening|good\s+afternoon)\b/i;
    if (greetingRegex.test(q)) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `Hello **${displayName}**! 👋 Great to connect with you. How can I assist you with your GeM procurement today?`,
          details: 'I can guide you through the step-by-step tender application procedure, verify document guidelines, or retrieve any previous/active tender and **convert its full specifications into an official downloadable PDF document**.',
          suggestions: [
            '📌 Steps to apply for a tender',
            '🔍 Search previous tenders',
            '📄 CA Turnover certificate rules',
            '🛡️ How does ELA fraud detection work?'
          ]
        }
      ]);
      return;
    }

    // 2. Check if user is asking for tender application steps
    if (
      q.includes('step') || 
      q.includes('apply') || 
      q.includes('how to bid') || 
      q.includes('procedure') || 
      q.includes('process') ||
      q.includes('guidelines') ||
      q.includes('tender apply')
    ) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `📋 **Official 7-Step Guide to Applying for a GeM Tender (for ${displayName})**`,
          steps: [
            {
              step: '1. Identity & Tax Verification',
              desc: 'Ensure your business PAN and GSTIN are active and match your legal entity name. The platform validates against simulated NSDL and GSTN registries.'
            },
            {
              step: '2. Review Tender Eligibility Matrix',
              desc: 'Open the tender details to check mandatory thresholds: Minimum Annual Turnover, Experience Years, and required certifications (e.g. ISO-9001, ISO-27001).'
            },
            {
              step: '3. Prepare Authentic Financial Documents',
              desc: 'Obtain an unedited, original CA Audited Turnover Certificate with official UDIN stamp. Do not edit text or splice digital seals, as Error Level Analysis (ELA) flags compressed modifications.'
            },
            {
              step: '4. Upload Proof of Experience & Certifications',
              desc: 'Attach Client Completion Certificates and ISO/CMMI certificates. Note: Reusing certificates belonging to sister firms or other bidders is flagged by Cross-Bidder Perceptual Hashing.'
            },
            {
              step: '5. Submit Structured Bid Application',
              desc: 'Click "Submit New Bid" on the Bidder Dashboard, select the tender, fill in your declared turnover and experience, attach your certificate files, and submit.'
            },
            {
              step: '6. Automated AI OCR & Drools Evaluation',
              desc: 'The backend immediately triggers Tesseract OCR, NLP entity repair, Drools rule compliance calculation, and SHAP explainability scoring.'
            },
            {
              step: '7. Monitor Status & File Grievance If Needed',
              desc: 'Track your bid on the dashboard. If flagged or rejected before final award locking, click "Submit Grievance / Appeal" to furnish supplemental proof to the Evaluation Officer.'
            }
          ],
          suggestions: [
            '🔍 Search previous tenders',
            '📄 CA Turnover certificate rules',
            '🛡️ How does ELA fraud detection work?'
          ]
        }
      ]);
      return;
    }

    // 3. Check if user is searching for a tender (active, previous, or by code/keyword)
    const matchedTenders = allTenders.filter(t => {
      return (
        q.includes(t.tenderNumber.toLowerCase()) ||
        t.tenderNumber.toLowerCase().includes(q) ||
        (q.includes('2024') && t.tenderNumber.includes('2024')) ||
        (q.includes('2025') && t.tenderNumber.includes('2025')) ||
        (q.includes('2026') && t.tenderNumber.includes('2026')) ||
        (q.includes('cloud') && t.title.toLowerCase().includes('cloud')) ||
        (q.includes('cctv') || q.includes('surveillance') && t.title.toLowerCase().includes('cctv')) ||
        (q.includes('server') || q.includes('hardware') && t.title.toLowerCase().includes('server')) ||
        (q.includes('solar') && t.title.toLowerCase().includes('solar')) ||
        (q.includes('railway') && t.department.toLowerCase().includes('rail')) ||
        (q.includes('defence') && t.department.toLowerCase().includes('defence')) ||
        (q.includes('meity') && t.department.toLowerCase().includes('meity')) ||
        (q.includes('previous') || q.includes('past') || q.includes('search tender') || q.includes('all tender') || q.includes('show tender') || q.includes('closed'))
      );
    });

    if (matchedTenders.length > 0 && (q.includes('tender') || q.includes('search') || q.includes('previous') || q.includes('past') || q.includes('gem') || q.includes('cloud') || q.includes('server') || q.includes('cctv') || q.includes('solar') || q.includes('find'))) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `🔍 **Found ${matchedTenders.length} Matching Tender(s)**:`,
          details: `Hello **${displayName}**, you can review the key parameters below or click **"📥 Download Official Tender PDF"** to convert any tender into an official Government Specification Dossier.`,
          tenderList: matchedTenders,
          suggestions: [
            '📌 Steps to apply for a tender',
            '📄 CA Turnover certificate rules',
            '🛡️ How does ELA fraud detection work?'
          ]
        }
      ]);
      return;
    }

    // 4. Document / CA Rules Query
    if (q.includes('ca') || q.includes('turnover') || q.includes('document') || q.includes('certificate') || q.includes('format') || q.includes('udin')) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `📄 **CA Turnover Certificate & UDIN Standards (for ${displayName})**`,
          details: 'To pass automated AI verification with a 100% Low Risk score:',
          points: [
            '• **Resolution & Format**: Use high-contrast PDF or original scans (minimum 300 DPI) in JPEG/PNG/PDF format.',
            '• **Mandatory UDIN**: Every Chartered Accountant turnover certificate must contain an active 18-digit UDIN.',
            '• **Zero Digital Alteration**: Do not use software (Photoshop, Paint, Acrobat) to modify dates, digits, or stamps. ELA detects compression boundary shifts.',
            '• **Cross-Verification**: Declared turnover in your bid form must strictly match the figures stated in the certified CA report.'
          ],
          suggestions: [
            '📌 Steps to apply for a tender',
            '🛡️ How does ELA fraud detection work?'
          ]
        }
      ]);
      return;
    }

    // 5. Fraud / Tamper / ELA detection explanation
    if (q.includes('fraud') || q.includes('ela') || q.includes('tamper') || q.includes('collusion') || q.includes('hash')) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: '🛡️ **How the Platform Detects Document Forgery & Collusion**',
          points: [
            '• **Error Level Analysis (ELA)**: Resaves image at 95% JPEG quality and analyzes pixel differential variance. Edited or pasted text exhibits sharp compression anomalies and triggers High Risk alerts.',
            '• **Perceptual Duplicate Hashing (dHash)**: Computes a 64-bit structural fingerprint of every certificate. If two distinct bidders upload identical certificates, a Cross-Bidder Collusion flag is recorded.',
            '• **Central Debarred Registry**: Bidder PAN is checked against CVC and GeM debarred registries under GFR Rule 151.',
            '• **Immutable SHA-256 Audit Trail**: Every detection is cryptographically signed and permanent.'
          ],
          suggestions: [
            '⚖️ How to submit an appeal / clarification',
            '🔍 Search previous tenders'
          ]
        }
      ]);
      return;
    }

    // 6. Appeals & Grievances
    if (q.includes('appeal') || q.includes('grievance') || q.includes('reject') || q.includes('clarification') || q.includes('disqualif')) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `⚖️ **Bidder Grievance & Appeal Procedure (for ${displayName})**`,
          details: 'If your bid receives a compliance flag or preliminary rejection:',
          points: [
            '• **Pre-Award Window**: Appeals can be filed before the Evaluation Officer records the final award decision.',
            '• **How to File**: Navigate to your submitted bids table on the Bidder Dashboard and click the red "Submit Appeal" button.',
            '• **Written Grounds**: Provide clear justification (e.g. referencing supplemental CA audit certificates or clarifying legal name changes).',
            '• **Officer Review**: The officer receives the appeal in their Decision Cockpit and can review your clarification before final locking.'
          ],
          suggestions: [
            '📌 Steps to apply for a tender',
            '🔍 Search previous tenders'
          ]
        }
      ]);
      return;
    }

    // 7. Interactive Casual Small Talk (Food, Meal, Health, Feelings, Jokes, Thanks)
    if (/(\bate\b|\beat\b|\beating\b|\bfood\b|\blunch\b|\bdinner\b|\bbreakfast\b|\bmeal\b|\bhungry\b)/i.test(q)) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `Haha, thank you for checking on me, **${displayName}**! 😄`,
          details: 'As an AI robot running on cloud servers, I don\'t eat real food—I fuel up on procurement regulations, Drools compliance rules, and clean electricity! ⚡ Did you have your meal? More importantly, how can I help you digest any tender documents or find active bids today?',
          suggestions: [
            '📌 Steps to apply for a tender',
            '🔍 Search previous tenders',
            '📄 CA Turnover certificate rules',
            '🛡️ How does ELA fraud detection work?'
          ]
        }
      ]);
      return;
    }

    if (/(how\s+are\s+you|how\s+r\s+u|how's\s+it\s+going|what's\s+up|wassup|how\s+do\s+you\s+do)/i.test(q)) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `I'm feeling fully charged and ready to assist, **${displayName}**! 🚀`,
          details: 'Everything is running smoothly on the GeM Compliance AI Engine. How are things on your side? Are you preparing a new bid or looking for upcoming tender opportunities?',
          suggestions: [
            '📌 Steps to apply for a tender',
            '🔍 Search previous tenders',
            '📄 CA Turnover certificate rules'
          ]
        }
      ]);
      return;
    }

    if (/(thank|thanks|thx|appreciate|awesome|great job|good job)/i.test(q)) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `You are very welcome, **${displayName}**! 🌟`,
          details: 'I am always here to help you navigate GeM procurement, review compliance guidelines, and win competitive tenders. Let me know whenever you need anything else!',
          suggestions: [
            '📌 Steps to apply for a tender',
            '🔍 Search previous tenders'
          ]
        }
      ]);
      return;
    }

    if (/(joke|funny|laugh|humor)/i.test(q)) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'bot',
          timestamp,
          text: `Here's one for you, **${displayName}**! 😄`,
          details: 'Why did the vendor bring a ladder to the GeM portal? Because they heard the compliance standards were top-tier! 🪜 But don\'t worry—with my guidance, reaching those standards is smooth sailing. Need help checking any bid documents today?',
          suggestions: [
            '📌 Steps to apply for a tender',
            '🔍 Search previous tenders',
            '🛡️ How does ELA fraud detection work?'
          ]
        }
      ]);
      return;
    }

    // 8. Conversational Fallback
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'bot',
        timestamp,
        text: `Hello **${displayName}**! 😊 I'm listening.`,
        details: 'I\'m your interactive GeM AI companion. I can guide you through the 7-step tender application procedure, verify CA turnover & UDIN rules, explain ELA fraud checks, or retrieve previous tenders and convert them into downloadable official specification PDFs!',
        suggestions: [
          '📌 Steps to apply for a tender',
          '🔍 Search previous tenders',
          '📄 CA Turnover certificate rules',
          '🛡️ How does ELA fraud detection work?'
        ]
      }
    ]);
  };

  return (
    <>
      {/* Dynamic Keyframes Styling */}
      <style>{`
        @keyframes gemBotFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes gemBotShadowPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(0.72); opacity: 0.22; }
        }
        @keyframes gemBeaconPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes gemTooltipFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Dynamic Draggable Robot Mascot Launcher Button */}
      <div
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Click to chat with GeM Sahayak AI • Drag to move anywhere"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 999999,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          transform: isHovered && !isDragging ? 'scale(1.06)' : 'scale(1)'
        }}
      >
        {/* Interactive Speech Bubble Tooltip */}
        {!isOpen && isHovered && !isDragging && (
          <div
            style={{
              position: 'absolute',
              bottom: '108%',
              whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, rgba(11, 61, 98, 0.96) 0%, rgba(7, 42, 68, 0.96) 100%)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '600',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(56, 189, 248, 0.4)',
              pointerEvents: 'none',
              backdropFilter: 'blur(8px)',
              animation: 'gemTooltipFade 0.2s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🤖 Ask GeM Sahayak!</span>
            <span style={{ color: '#38bdf8', fontSize: '10px' }}>• Drag me anywhere</span>
          </div>
        )}

        {/* Ambient Glow Aura that matches website navy/cyan palette */}
        <div
          style={{
            position: 'absolute',
            top: '36px',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '82px',
            height: '82px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, rgba(11, 61, 98, 0.22) 50%, transparent 75%)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Floating Robot Mascot Character */}
        <div
          style={{
            animation: isDragging ? 'none' : 'gemBotFloat 2.8s ease-in-out infinite',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <img
            src={gemBotImg}
            alt="GeM Sahayak AI Robot"
            draggable={false}
            style={{
              width: '76px',
              height: 'auto',
              maxHeight: '86px',
              objectFit: 'contain',
              filter: isHovered 
                ? 'drop-shadow(0 0 16px rgba(6, 182, 212, 0.8)) drop-shadow(0 8px 14px rgba(11, 61, 98, 0.45))'
                : 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.45)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25))',
              transition: 'filter 0.25s ease'
            }}
          />
        </div>

        {/* Hovering Dynamic Floor Shadow */}
        <div
          style={{
            width: '46px',
            height: '9px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.5) 0%, rgba(11, 61, 98, 0.35) 45%, transparent 75%)',
            marginTop: '-6px',
            animation: isDragging ? 'none' : 'gemBotShadowPulse 2.8s ease-in-out infinite',
            pointerEvents: 'none'
          }}
        />

        {/* High-Tech Frosted Website-Coordinated Pill Badge */}
        <div
          style={{
            marginTop: '3px',
            background: 'linear-gradient(135deg, rgba(11, 61, 98, 0.95) 0%, rgba(7, 42, 68, 0.95) 100%)',
            color: '#ffffff',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            borderRadius: '20px',
            padding: '3px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(11, 61, 98, 0.35)',
            backdropFilter: 'blur(8px)',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.2px'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981',
              animation: 'gemBeaconPulse 1.8s infinite'
            }}
          />
          <span>{isOpen ? 'Close Chat' : 'GeM Sahayak AI'}</span>
        </div>
      </div>

      {/* Floating Chat Modal Dialog */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: position.x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 500) ? 'auto' : '24px',
          left: position.x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 500) ? '24px' : 'auto',
          width: '440px',
          maxWidth: 'calc(100vw - 32px)',
          height: '620px',
          maxHeight: 'calc(100vh - 48px)',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(6, 182, 212, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 99998,
          overflow: 'hidden',
          animation: 'fadeInUp 0.25s ease-out'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0b3d62 0%, #072a44 100%)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #e05624'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(11, 61, 98, 0.4) 100%)',
                borderRadius: '12px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.35)',
                border: '1px solid rgba(56, 189, 248, 0.4)'
              }}>
                <img src={gemBotImg} alt="GeM Bot" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', letterSpacing: '0.2px' }}>
                  GeM Sahayak — Bidder AI
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span>Steps Guidance & Tender Dossier Generator</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => {
                  setMessages([{
                    id: Date.now(),
                    sender: 'bot',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    text: 'Chat history cleared. How may I assist your procurement today?',
                    suggestions: [
                      '📌 Steps to apply for a tender',
                      '🔍 Search previous tenders',
                      '📄 CA Turnover certificate rules'
                    ]
                  }]);
                }}
                title="Reset Conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'white',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Stream Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%'
                }}
              >
                {msg.sender === 'bot' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#0b3d62',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    boxShadow: '0 2px 6px rgba(11, 61, 98, 0.3)',
                    overflow: 'hidden'
                  }}>
                    <img src={gemBotImg} alt="Bot" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                  </div>
                )}

                <div style={{
                  backgroundColor: msg.sender === 'user' ? '#0b3d62' : '#ffffff',
                  color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '12px 14px',
                  boxShadow: msg.sender === 'user' ? '0 2px 6px rgba(11, 61, 98, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
                  border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  fontSize: '13px',
                  lineHeight: '1.45'
                }}>
                  {/* Message Title / Text rendered with separate lines, lists, and tables */}
                  <div style={{ fontWeight: '400', wordBreak: 'break-word' }}>
                    {renderStructuredMessage(msg.text, msg.sender === 'user')}
                  </div>

                  {/* Optional Details Paragraph rendered with separate lines */}
                  {msg.details && (
                    <div style={{ marginTop: '8px', fontSize: '12.5px', color: msg.sender === 'user' ? '#e2e8f0' : '#475569', wordBreak: 'break-word' }}>
                      {renderStructuredMessage(msg.details, msg.sender === 'user')}
                    </div>
                  )}

                  {/* RAG Context Citation Tag */}
                  {msg.isRAG && msg.retrievedContext && msg.retrievedContext.length > 0 && (
                    <div style={{
                      marginTop: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      color: '#1d4ed8',
                      fontWeight: '600'
                    }}>
                      <span>🧠 RAG Sourced:</span>
                      <span style={{ color: '#1e40af' }}>{msg.retrievedContext.slice(0, 2).join(', ')}</span>
                    </div>
                  )}

                  {/* Steps List (For tender apply steps) */}
                  {msg.steps && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {msg.steps.map((st, idx) => (
                        <div key={idx} style={{
                          backgroundColor: '#f1f5f9',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          borderLeft: '3px solid #e05624'
                        }}>
                          <div style={{ fontWeight: '700', color: '#0b3d62', fontSize: '12.5px' }}>
                            {renderInlineFormatted(st.step, `st-step-${idx}`, false)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                            {renderInlineFormatted(st.desc, `st-desc-${idx}`, false)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bullet Points */}
                  {msg.points && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {msg.points.map((pt, idx) => (
                        <div key={idx} style={{ fontSize: '12px', color: '#334155' }}>
                          {renderInlineFormatted(pt, `pt-${idx}`, false)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tender List Cards & Document Generator Buttons */}
                  {msg.tenderList && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {msg.tenderList.map((tender) => (
                        <div key={tender.id || tender.tenderNumber} style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          backgroundColor: '#f8fafc'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{
                              fontWeight: '700',
                              color: '#0b3d62',
                              fontSize: '12.5px'
                            }}>
                              {tender.tenderNumber}
                            </span>
                            <span style={{
                              backgroundColor: tender.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                              color: tender.status === 'ACTIVE' ? '#15803d' : '#475569',
                              fontSize: '10.5px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {tender.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>
                            {tender.title}
                          </div>

                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            🏛️ {tender.department}
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '4px',
                            marginTop: '6px',
                            fontSize: '11.5px',
                            backgroundColor: '#ffffff',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div><b>Value:</b> {formatINR(tender.estimatedValue)}</div>
                            <div><b>Min Turnover:</b> {formatINR(tender.minTurnover)}</div>
                            <div><b>Experience:</b> {tender.minExperienceYears} yrs</div>
                            <div><b>Certs:</b> {(tender.requiredCerts || []).join(', ') || 'ISO-9001'}</div>
                          </div>

                          {/* Convert to Document Button */}
                          <button
                            onClick={() => generateTenderDocument(tender)}
                            style={{
                              marginTop: '8px',
                              width: '100%',
                              backgroundColor: '#0b3d62',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '7px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#072a44'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0b3d62'}
                          >
                            <Download size={14} color="#fbbf24" />
                            <span>📥 Download Official Tender PDF</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Single Tender Card Confirmation */}
                  {msg.tenderCard && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 10px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      color: '#166534'
                    }}>
                      ✅ Document rendered with official GeM header, Drools criteria table, GFR fraud warning, and bidder checklist.
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {msg.suggestions && (
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {msg.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(sug.replace(/^[^\w]+/, ''))}
                          style={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '14px',
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            color: '#0b3d62',
                            cursor: 'pointer',
                            fontWeight: '500',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e2e8f0';
                            e.currentTarget.style.borderColor = '#0b3d62';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div style={{
                    fontSize: '10px',
                    color: msg.sender === 'user' ? '#cbd5e1' : '#94a3b8',
                    marginTop: '5px',
                    textAlign: 'right'
                  }}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#e05624',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <User size={18} color="white" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#64748b', fontSize: '12px' }}>
                <img src={gemBotImg} alt="Thinking" style={{ width: '20px', height: '20px', objectFit: 'contain', animation: 'gemBotFloat 1.4s ease-in-out infinite' }} />
                <span>GeM Sahayak is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Bar */}
          <div style={{
            padding: '8px 14px',
            backgroundColor: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <button
              onClick={() => handleSendMessage('Steps to apply for a tender')}
              style={{
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                color: '#1e293b'
              }}
            >
              📋 Steps to Apply
            </button>
            <button
              onClick={() => handleSendMessage('Search previous tenders')}
              style={{
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                color: '#1e293b'
              }}
            >
              🔍 Search Tenders
            </button>
            <button
              onClick={() => handleSendMessage('How does ELA fraud detection work?')}
              style={{
                background: 'white',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                color: '#1e293b'
              }}
            >
              🛡️ Fraud Checks
            </button>
          </div>

          {/* Input Box Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '12px 14px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Ask about steps, or search tender (e.g. GEM/2024, Cloud)..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: '24px',
                padding: '9px 16px',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0b3d62'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              style={{
                background: inputValue.trim() ? '#0b3d62' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputValue.trim() ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
