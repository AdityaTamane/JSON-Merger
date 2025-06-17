import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactJson from "react-json-view";
import { useDropzone } from "react-dropzone";
import "./JSONUploader.css";
import "./BouncingArrow.css";

function JSONUploader({ limitMB, usedMB, isDarkMode }) {
    // Keep jsonFiles as an array of parsed JSON objects for merge logic
    const [jsonFiles, setJsonFiles] = useState([]);
    // fileDetails will now store { name, size, parsedJson }
    const [fileDetails, setFileDetails] = useState([]); // This will be the source of truth for files
    const [mergedJson, setMergedJson] = useState(null);
    const [override, setOverride] = useState(true);
    const [uploadedMB, setUploadedMB] = useState(0); // Total MB of currently displayed files
    const [loading, setLoading] = useState(false);
    const [uploadCompleted, setUploadCompleted] = useState(false);
    const mergeButtonRef = useRef(null);

    // Function to calculate total size from current fileDetails
    const calculateTotalUploadedMB = (details) => {
        return details.reduce((sum, file) => sum + parseFloat(file.size), 0);
    };

    const handleFileProcessing = async (files) => {
        const newFileDetails = [];
        const newJsonFiles = [];
        let currentUploadSize = 0;

        for (const file of files) {
            const text = await file.text();
            try {
                const parsed = JSON.parse(text);
                const sizeMB = new Blob([text]).size / (1024 * 1024);
                
                // Check if file already exists by name (optional, to prevent duplicate uploads)
                if (fileDetails.some(existingFile => existingFile.name === file.name)) {
                    alert(`Skipping duplicate file: ${file.name}`);
                    continue;
                }

                newFileDetails.push({ name: file.name, size: sizeMB.toFixed(2), parsedJson: parsed });
                newJsonFiles.push(parsed);
                currentUploadSize += sizeMB;

            } catch (err) {
                alert(`❌ Invalid JSON in file: ${file.name}`);
                // Clear any partial uploads from this batch if one fails
                setJsonFiles([]);
                setFileDetails([]);
                setUploadedMB(0);
                setUploadCompleted(false);
                setMergedJson(null); // Clear merged output
                return;
            }
        }

        const combinedFileDetails = [...fileDetails, ...newFileDetails];
        const totalSizeAfterNewUpload = calculateTotalUploadedMB(combinedFileDetails);

        const totalUsage = usedMB + totalSizeAfterNewUpload;
        if (totalUsage > limitMB) {
            alert(`🚫 Plan exceeded. Limit: ${limitMB} MB, Already Used: ${usedMB.toFixed(2)} MB, Attempted Upload: ${totalSizeAfterNewUpload.toFixed(2)} MB`);
            // Do not add the new files if limit is exceeded
            setUploadCompleted(false); // No new successful upload
            return;
        }

        setFileDetails(combinedFileDetails);
        setJsonFiles(combinedFileDetails.map(f => f.parsedJson)); // Update jsonFiles based on fileDetails
        setUploadedMB(totalSizeAfterNewUpload);
        setUploadCompleted(true);
        setMergedJson(null); // Clear merged output on new upload
    };

    const handleDrop = (acceptedFiles) => {
        handleFileProcessing(acceptedFiles);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleDrop,
        accept: { 'application/json': ['.json'] },
        multiple: true,
    });

    const handleRemoveFile = (fileNameToRemove) => {
        const updatedFileDetails = fileDetails.filter(file => file.name !== fileNameToRemove);
        const updatedJsonFiles = updatedFileDetails.map(file => file.parsedJson);

        setFileDetails(updatedFileDetails);
        setJsonFiles(updatedJsonFiles);
        setUploadedMB(calculateTotalUploadedMB(updatedFileDetails));
        setMergedJson(null); // Clear merged output when a file is removed

        if (updatedFileDetails.length < 2) {
            setUploadCompleted(false); // No longer enough files for merge prompt
        }
    };

    const handleMerge = async () => {
        if (jsonFiles.length < 2) {
            alert("Please upload at least 2 JSON files to merge.");
            return;
        }

        setLoading(true);
        setMergedJson(null);

        try {
            const res = await axios.post("http://localhost:8000/merge-json", {
            jsons: jsonFiles,  // Array of parsed JSONs
            override: override,
            });
            setMergedJson(res.data.merged);
        } catch (error) {
            console.error("Error merging JSONs:", error);
            alert(`❌ Failed to merge JSONs: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const downloadAsJson = (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "merged_json_output.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const totalCurrentUsage = usedMB + uploadedMB;
    const totalUsagePercent = ((totalCurrentUsage / limitMB) * 100).toFixed(2);

    const scrollToMergeButton = () => {
        mergeButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Reset uploadCompleted if jsonFiles count drops below 2
        if (jsonFiles.length < 2) {
            setUploadCompleted(false);
        }
    }, [jsonFiles.length]);


    return (
        <div className={`json-uploader ${isDarkMode ? "dark" : "light"}`}>
            <section className="upload-section">
                <h2 className="section-title">Upload JSON Files</h2>
                <div {...getRootProps({ className: `dropzone ${isDragActive ? "active" : ""}` })}>
                    <input {...getInputProps()} />
                    <p className="dropzone-text">
                        {isDragActive ? "Drop the files here..." : "Drag & drop JSON files here, or click to select"}
                    </p>
                    <p className="dropzone-hint">Supports multiple files (.json) : (minimum 2 files)</p>
                </div>
                {uploadCompleted && jsonFiles.length >= 2 && (
                    <div className="arrow-container" onClick={scrollToMergeButton}>
                        <div className="bouncing-arrow"></div>
                    </div>
                )}
            </section>

            <section className="usage-section">
                <h2 className="section-title">Usage Details</h2>
                <div className="usage-grid">
                    <div className="usage-item">
                        <p className="usage-label">Plan Limit:</p>
                        <p className="usage-value">{limitMB} MB</p>
                    </div>
                    <div className="usage-item">
                        <p className="usage-label">Already Used:</p>
                        <p className="usage-value">{usedMB.toFixed(2)} MB</p>
                    </div>
                    <div className="usage-item">
                        <p className="usage-label">Uploaded Now:</p>
                        <p className="usage-value">{uploadedMB.toFixed(2)} MB</p>
                    </div>
                    <div className="usage-item total-usage">
                        <p className="usage-label">Total Current Usage:</p>
                        <p className="usage-value">{totalCurrentUsage.toFixed(2)} MB</p>
                    </div>
                </div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${totalUsagePercent}%` }}></div>
                </div>
                <p className="progress-label">{totalUsagePercent}% of plan used</p>
            </section>

            {fileDetails.length > 0 && (
                <section className="file-list-section">
                    <h2 className="section-title">Uploaded Files ({fileDetails.length})</h2>
                    <div className="file-list-items">
                        {fileDetails.map((file, index) => (
                            <div key={file.name} className="file-item">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">{file.size} MB</span>
                                <button
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(file.name)}
                                    title={`Remove ${file.name}`}
                                >
                                    &times; 
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="options-section">
                <h2 className="section-title">Merge Options</h2>
                <label className="checkbox-container">
                    <input
                        type="checkbox"
                        checked={override}
                        onChange={() => setOverride(!override)}
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-text">Override existing keys in later files</span>
                </label>
                <p className="option-hint">If checked, keys present in later files will overwrite values from earlier files. If unchecked, earlier values will be preserved.</p>
            </section>

            <div className="action-area">
                <button
                    onClick={handleMerge}
                    disabled={jsonFiles.length < 2 || totalCurrentUsage > limitMB || loading}
                    className="btn-primary merge-button"
                    ref={mergeButtonRef}
                >
                    {loading ? (
                        <>
                            <span className="spinner"></span> Merging...
                        </>
                    ) : (
                        <>
                            <span className="icon">🔀</span> Merge JSONs
                        </>
                    )}
                </button>

                {mergedJson && (
                    <button onClick={() => downloadAsJson(mergedJson)} className="btn-primary download-button">
                        <span className="icon">📥</span> Download Merged JSON
                    </button>
                )}
            </div>

            {mergedJson && (
                <section className="merged-output-section">
                    <h2 className="section-title">Merged JSON Output</h2>
                    <div className="json-viewer-container">
                        <ReactJson
                            src={mergedJson}
                            collapsed={2}
                            displayDataTypes={false}
                            displayObjectSize={true}
                            theme={isDarkMode ? "monokai" : "rjv-default"}
                            enableClipboard={true}
                            style={{ padding: '15px', borderRadius: 'var(--border-radius-sm)', backgroundColor: isDarkMode ? '#282c34' : '#f5f5f5' }}
                        />
                    </div>
                </section>
            )}
        </div>
    );
}

export default JSONUploader;