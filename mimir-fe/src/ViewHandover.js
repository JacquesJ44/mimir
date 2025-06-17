import axios from "./AxiosInstance.js";
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs} from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    
  const ViewHandover = () => {
      
      const {id} = useParams()
      const [file, setFile] = useState()
      
      const [numPages, setNumPages] = useState(null);
      const [pageNumber, setPageNumber] = useState(1);
      
      function onDocumentLoadSuccess({ numPages }) {
          setNumPages(numPages);
          setPageNumber(1);
        }
      
        function changePage(offset) {
          setPageNumber(prevPageNumber => prevPageNumber + offset);
        }
      
        function previousPage() {
          changePage(-1);
        }
      
        function nextPage() {
          changePage(1);
        }
      
        useEffect(() => {
          const fetchFile = async () => {
            try {
              const response = await axios.get(`/mimir/api/download/${id}`, {
                responseType: 'blob', // 👈 important for binary files like PDFs
                withCredentials: true
              });
              
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              setFile(url); // Store the URL, not the blob itself
            } catch (error) {
              console.error('Error fetching file:', error);
            }
          };

          fetchFile();

          // Optional: Clean up blob URL when component unmounts
          return () => {
            if (file) {
              URL.revokeObjectURL(file);
            }
          };
        }, [id]);

  return ( 
      <>
      <div>
        <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} />
        </Document>
        <div>
          <p>
            Page {pageNumber || (numPages ? 1 : '--')} of {numPages || '--'}
          </p>
          <button
            className="mx-2 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-gray-200 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            type="button"
            disabled={pageNumber <= 1}
            onClick={previousPage}
            >
            Previous
          </button>

          <button
            className="mx-2 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-gray-200 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            type="button"
            disabled={pageNumber >= numPages}
            onClick={nextPage}
            >
            Next
          </button>
          {file && (
            <div className="mt-4">
              <a
                  href={file}
                  download={`circuit_doc_${id}.pdf`}
                  className="btn btn-accent">
                  Download Document
              </a>
            </div>
          )}
        </div>
      </div>
      </>
    );
}
 
export default ViewHandover;