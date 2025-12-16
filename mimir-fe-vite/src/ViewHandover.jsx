// ViewHandover.jsx
import axios from "./AxiosInstance.js";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Vite-compatible PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

const ViewHandover = () => {
  const { id } = useParams();
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(null);

  // Load PDF successfully
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset) => {
    setPageNumber((prev) => prev + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const openPdf = () => {
    if (file) window.open(file, "_blank");
  };

  // Responsive page width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setPageWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Fetch PDF from backend
  useEffect(() => {
      let url = null;

      const fetchFile = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await axios.get(`/api/download/${id}`, {
            responseType: "arraybuffer",
          });
          url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
          setFile(url);
        } catch (err) {
          console.error("Error fetching PDF:", err);
          setError(err.response?.data?.error || "Failed to load PDF");
        } finally {
          setLoading(false);
        }
      };

      fetchFile();

      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    }, [id]);



  if (loading) return <p className="text-center mt-10">Loading PDF...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (!file) return <p className="text-center mt-10">No PDF available.</p>;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* PDF Container */}
      <div ref={containerRef}>
        {pageWidth && (
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
            <Page pageNumber={pageNumber} width={pageWidth} />
          </Document>
        )}
      </div>

      {/* Pagination / Download */}
      <div className="mt-4 flex justify-between items-center">
        <div>
          <button
            className="mx-2 px-3 py-2 bg-gray-200 rounded-md hover:bg-yellow-400 disabled:opacity-50"
            disabled={pageNumber <= 1}
            onClick={previousPage}
          >
            Previous
          </button>
          <button
            className="mx-2 px-3 py-2 bg-gray-200 rounded-md hover:bg-yellow-400 disabled:opacity-50"
            disabled={pageNumber >= numPages}
            onClick={nextPage}
          >
            Next
          </button>
        </div>
        <p>
          Page {pageNumber} of {numPages}
        </p>
        <div>
          <a
            href={file}
            download={`circuit_doc_${id}.pdf`}
            className="mx-2 px-3 py-2 bg-accent text-white rounded-md hover:brightness-110"
          >
            Download PDF
          </a>
          <button
          onClick={() => window.open(file, "_blank")}
          className="mx-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:brightness-110"
        >
          Open PDF in new tab
        </button>
        </div>
      </div>
    </div>
  );
};

export default ViewHandover;
