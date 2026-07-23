import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal, Button } from '@/components/ui';
import { QrCode, Download, Printer, Copy, Check, ExternalLink, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';

export const TableQRModal = ({ isOpen, onClose, table, allTables = [], restaurantName = 'Vyavastha Restaurant' }) => {
  const [copied, setCopied] = React.useState(false);
  const [batchMode, setBatchMode] = React.useState(false);
  const [customHost, setCustomHost] = React.useState('');
  const printRef = useRef();

  if (!isOpen) return null;

  const targetTable = table || (allTables.length > 0 ? allTables[0] : null);
  if (!targetTable && !batchMode) return null;

  const getQRUrl = (tId) => {
    const baseHost = customHost.trim() || window.location.origin;
    // Clean trailing slash if present
    const cleanBase = baseHost.endsWith('/') ? baseHost.slice(0, -1) : baseHost;
    return `${cleanBase}/customer/table/${tId}/order`;
  };

  const currentUrl = targetTable ? getQRUrl(targetTable._id) : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success('Order link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const svg = document.getElementById(`qr-code-svg-${targetTable._id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 80;
      canvas.height = img.height + 140;

      // Draw background frame
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw header text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(restaurantName, canvas.width / 2, 40);

      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`TABLE ${targetTable.tableNumber}`, canvas.width / 2, 65);

      // Draw QR Code
      ctx.drawImage(img, 40, 80);

      // Draw Footer instructions
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('Scan to View Menu & Order', canvas.width / 2, canvas.height - 20);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Table_${targetTable.tableNumber}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success(`Downloaded QR Code for Table ${targetTable.tableNumber}`);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowPrint = window.open('', '', 'width=900,height=800');
    windowPrint.document.write(`
      <html>
        <head>
          <title>Print Table QR Codes - ${restaurantName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #f8fafc; text-align: center; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
            .qr-card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); page-break-inside: avoid; }
            .restaurant-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; }
            .table-badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 18px; font-weight: 800; padding: 4px 12px; border-radius: 8px; margin-bottom: 12px; }
            .qr-wrapper { display: flex; justify-content: center; margin: 10px 0; }
            .instructions { font-size: 12px; color: #64748b; font-weight: 500; margin-top: 10px; }
            @media print {
              body { background: white; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

  const displayTablesList = batchMode ? allTables : (targetTable ? [targetTable] : []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Table Ordering QR Codes" className="max-w-2xl w-full">
      <div className="space-y-6 text-left">
        {/* Toggle Mode Bar if multiple tables are available */}
        {allTables.length > 1 && (
          <div className="flex justify-between items-center bg-dark-50 dark:bg-dark-800 p-1.5 rounded-xl border border-dark-200 dark:border-dark-750">
            <button
              onClick={() => setBatchMode(false)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !batchMode
                  ? 'bg-white dark:bg-dark-900 text-dark-900 dark:text-white shadow-sm'
                  : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
              }`}
            >
              Single Table QR ({targetTable?.tableNumber})
            </button>
            <button
              onClick={() => setBatchMode(true)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                batchMode
                  ? 'bg-white dark:bg-dark-900 text-dark-900 dark:text-white shadow-sm'
                  : 'text-dark-500 hover:text-dark-900 dark:hover:text-white'
              }`}
            >
              Batch All Tables ({allTables.length} QRs)
            </button>
          </div>
        )}

        {/* Host / Network IP Override helper for Mobile Phone QR Scanning */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-brand-50/20 dark:bg-brand-950/20 border border-brand-500/20 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-brand-650 flex-shrink-0" />
            <span className="text-dark-700 dark:text-dark-300 font-medium">
              Scanning from mobile phone? Base Domain / Local IP:
            </span>
          </div>
          <input
            type="text"
            placeholder={`Default: ${window.location.origin}`}
            value={customHost}
            onChange={(e) => setCustomHost(e.target.value)}
            className="px-2.5 py-1 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-750 rounded-lg text-xs w-full sm:w-60 font-mono text-brand-650 dark:text-brand-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Printable Area */}
        <div ref={printRef} className="bg-dark-50/50 dark:bg-dark-900/50 p-6 rounded-2xl border border-dark-200 dark:border-dark-800 max-h-[360px] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center">
            {displayTablesList.map((tbl) => (
              <div
                key={tbl._id}
                className="qr-card bg-white dark:bg-dark-850 p-6 rounded-2xl border-2 border-dark-200 dark:border-dark-750 shadow-md flex flex-col items-center text-center w-full max-w-[260px] transition-all hover:shadow-lg"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-dark-400 dark:text-dark-400 uppercase tracking-wider mb-1">
                  <Utensils className="w-3.5 h-3.5 text-brand-650" />
                  <span>{restaurantName}</span>
                </div>
                <div className="table-badge bg-brand-50 dark:bg-brand-950/40 text-brand-650 dark:text-brand-400 text-base font-extrabold px-3 py-1 rounded-xl mb-3 border border-brand-500/20">
                  TABLE {tbl.tableNumber}
                </div>
                {tbl.floor && (
                  <span className="text-[11px] font-medium text-dark-500 mb-3 -mt-2">
                    {tbl.floor}
                  </span>
                )}

                <div className="qr-wrapper bg-white p-3 rounded-xl border border-dark-100 shadow-inner my-1">
                  <QRCodeSVG
                    id={`qr-code-svg-${tbl._id}`}
                    value={getQRUrl(tbl._id)}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <p className="instructions text-xs font-semibold text-dark-600 dark:text-dark-300 mt-3 flex items-center justify-center gap-1">
                  <span>📱 Scan to Order Food</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-dark-100 dark:border-dark-800">
          {!batchMode && targetTable && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopyLink} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
              </Button>
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-650 hover:underline px-2"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {!batchMode && targetTable && (
              <Button variant="secondary" size="sm" onClick={handleDownloadSingle} className="gap-1.5">
                <Download className="w-4 h-4 text-brand-650" />
                <span>Download PNG</span>
              </Button>
            )}

            <Button variant="primary" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              <span>{batchMode ? `Print All (${allTables.length}) QRs` : 'Print QR Card'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TableQRModal;
