import type { StudentAdmissionRecord } from '../services/schoolAdminService';
import { buildStudentRecordPrintHtml } from './studentRecordExport';

/** Open the native print dialog for an isolated record without an extra preview tab. */
export const printStudentRecord = (record: StudentAdmissionRecord, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const frame = document.createElement('iframe');
    frame.title = record.student.name;
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;';
    let timeout: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      frame.remove();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    signal.addEventListener('abort', abort, { once: true });
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Print document did not load'));
    }, 15000);
    frame.onload = async () => {
      try {
        const printWindow = frame.contentWindow;
        if (!printWindow) throw new Error('Print window is unavailable');
        await printWindow.document.fonts.ready;
        if (signal.aborted) return;
        clearTimeout(timeout);
        printWindow.addEventListener('afterprint', finish, { once: true });
        // Fallback for browsers that do not emit afterprint; keep the document alive
        // when print() returns before the native print dialog has closed.
        timeout = setTimeout(finish, 120000);
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    frame.srcdoc = buildStudentRecordPrintHtml(record);
    document.body.appendChild(frame);
  });
