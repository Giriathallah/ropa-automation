"use client";

import { useState, useRef, FormEvent, ChangeEvent, DragEvent } from "react";
import * as XLSX from "xlsx";

// Interface and helper function section (no changes needed here)
interface RopaCell {
  value: string | null;
  source: "initial" | "manual" | "ai"; // 'initial' (dari AI), 'manual', 'ai' (dari chat)
}
interface RopaData {
  no_aktivitas: RopaCell;
  nama_aktivitas: RopaCell;
  unit_kerja: RopaCell;
  departemen: RopaCell;
  penanggung_jawab: RopaCell;
  kedudukan_pemilik_proses: RopaCell;
  tujuan_pemrosesan: RopaCell;
  kebijakan_rujukan: RopaCell;
  bentuk_data_pribadi: RopaCell;
  subjek_data_pribadi: RopaCell;
  jenis_data_pribadi: RopaCell;
  data_pribadi_spesifik: RopaCell;
  sumber_data: RopaCell;
  penyimpanan_data: RopaCell;
  metode_pemrosesan: RopaCell;
  dasar_pemrosesan: RopaCell;
  masa_retensi: RopaCell;
  langkah_teknis_pengamanan: RopaCell;
  langkah_organisasi_pengamanan: RopaCell;
  kategori_penerima: RopaCell;
  profil_penerima: RopaCell;
  asesmen_risiko: RopaCell;
  proses_sebelumnya: RopaCell;
  proses_setelahnya: RopaCell;
  keterangan_tambahan: RopaCell;
  saran_ai: string;
}
interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}
interface RopaResult extends RopaData {
  fileName: string;
}
const transformApiDataToState = (data: any): RopaData => {
  const transformed: Partial<RopaData> = {};
  const allKeys: (keyof Omit<RopaData, "saran_ai">)[] = [
    "no_aktivitas",
    "nama_aktivitas",
    "unit_kerja",
    "departemen",
    "penanggung_jawab",
    "kedudukan_pemilik_proses",
    "tujuan_pemrosesan",
    "kebijakan_rujukan",
    "bentuk_data_pribadi",
    "subjek_data_pribadi",
    "jenis_data_pribadi",
    "data_pribadi_spesifik",
    "sumber_data",
    "penyimpanan_data",
    "metode_pemrosesan",
    "dasar_pemrosesan",
    "masa_retensi",
    "langkah_teknis_pengamanan",
    "langkah_organisasi_pengamanan",
    "kategori_penerima",
    "profil_penerima",
    "asesmen_risiko",
    "proses_sebelumnya",
    "proses_setelahnya",
    "keterangan_tambahan",
  ];
  allKeys.forEach((key) => {
    transformed[key] = { value: data[key] || null, source: "initial" };
  });
  transformed.saran_ai = data.saran_ai || "";
  return transformed as RopaData;
};

export default function RopaAnalyzerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<RopaResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const handleFiles = (selectedFiles: FileList | null) => {
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) =>
    handleFiles(e.target.files);
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // handler analyze file
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Silakan pilih satu atau lebih file terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]);
    setIsEditMode(false);

    // This logic sends one API request PER file, and the API returns an array of results
    const promises = files.map((file) => {
      const formData = new FormData();
      formData.append("datanya", file);
      return fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            return response
              .json()
              .then((err) =>
                Promise.reject({ fileName: file.name, error: err.error })
              );
          }
          return response.json();
        })
        .then((dataArray) => {
          // The API returns an array, even for one file, so we take the first element
          const rawResult = dataArray[0];
          return {
            ...transformApiDataToState(rawResult), // ✅ PERBAIKAN DI SINI
            fileName: file.name,
          };
        });
    });

    try {
      const allResults = await Promise.all(promises);
      setResults(allResults);
    } catch (err: any) {
      setError(
        `Gagal memproses file "${err.fileName}": ${
          err.error || "Terjadi kesalahan tidak diketahui."
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // handler edit tabel manual
  const handleManualEdit = (
    resultIndex: number,
    fieldName: keyof RopaData,
    newValue: string
  ) => {
    const newResults = [...results];
    if (fieldName in newResults[resultIndex]) {
      const targetCell = newResults[resultIndex][fieldName] as RopaCell;
      if (targetCell) {
        targetCell.value = newValue;
        targetCell.source = "manual";
        setResults(newResults);
      }
    }
  };

  const handleDownloadExcel = () => {
    if (results.length === 0) return;

    const dataToExport = results.map((result) => ({
      "File Asal": result.fileName,
      "No Aktivitas": result.no_aktivitas.value || "N/A",
      "Nama Aktivitas": result.nama_aktivitas.value || "N/A",
      "Unit Kerja / Divisi": result.unit_kerja.value || "N/A",
      "Departemen / Sub-Departemen": result.departemen.value || "N/A",
      "Penanggung Jawab Proses": result.penanggung_jawab.value || "N/A",
      "Kedudukan Pemilik Proses":
        result.kedudukan_pemilik_proses.value || "N/A",
      "Tujuan Pemrosesan": result.tujuan_pemrosesan.value || "N/A",
      "Kebijakan/SOP/IK/Dokumen Rujukan":
        result.kebijakan_rujukan.value || "N/A",
      "Bentuk Data Pribadi": result.bentuk_data_pribadi.value || "N/A",
      "Subjek Data Pribadi": result.subjek_data_pribadi.value || "N/A",
      "Jenis Data Pribadi": result.jenis_data_pribadi.value || "N/A",
      "Data Pribadi Spesifik": result.data_pribadi_spesifik.value || "N/A",
      "Sumber Pemerolehan Data Pribadi": result.sumber_data.value || "N/A",
      "Penyimpanan Data Pribadi": result.penyimpanan_data.value || "N/A",
      "Metode Pemrosesan Data Pribadi": result.metode_pemrosesan.value || "N/A",
      "Dasar Pemrosesan": result.dasar_pemrosesan.value || "N/A",
      "Masa Retensi": result.masa_retensi.value || "N/A",
      "Langkah Teknis Pengamanan Data Pribadi":
        result.langkah_teknis_pengamanan.value || "N/A",
      "Langkah Organisasi Pengamanan Data Pribadi":
        result.langkah_organisasi_pengamanan.value || "N/A",
      "Kategori dan Jenis Penerima Data Pribadi":
        result.kategori_penerima.value || "N/A",
      "Profil Penerima Data Pribadi": result.profil_penerima.value || "N/A",
      "Asesmen Risiko": result.asesmen_risiko.value || "N/A",
      "Proses / Kegiatan Sebelumnya": result.proses_sebelumnya.value || "N/A",
      "Proses / Kegiatan Setelahnya": result.proses_setelahnya.value || "N/A",
      "Keterangan / Catatan Tambahan":
        result.keterangan_tambahan.value || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RoPA_Data");
    worksheet["!cols"] = Array(26).fill({ wch: 35 });
    XLSX.writeFile(workbook, "Hasil_Analisis_Multi-File.xlsx");
  };

  // handler chat ato brainstorming
  const handleChatSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim() || results.length === 0) return;

    const userMessage: ChatMessage = { sender: "user", text: chatInput };
    setChatHistory((prev) => [...prev, userMessage]);
    setChatInput("");

    try {
      const response = await fetch("/api/brainstorming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: chatInput, context: results }),
      });

      if (!response.ok) throw new Error("Gagal mendapatkan respons dari AI.");

      const res = await response.json();
      const aiMessage: ChatMessage = { sender: "ai", text: res.answer };
      setChatHistory((prev) => [...prev, aiMessage]);

      //  update data tabel dari chat
      if (res.updatedData && Array.isArray(res.updatedData)) {
        const newResults = [...results];
        res.updatedData.forEach(
          (update: { fileName: string; field: string; value: string }) => {
            const resultIndex = newResults.findIndex(
              (r) => r.fileName === update.fileName
            );
            if (resultIndex !== -1) {
              const fieldName = update.field as keyof RopaData;
              const targetCell = newResults[resultIndex][fieldName] as RopaCell;
              if (targetCell) {
                targetCell.value = update.value;
                targetCell.source = "ai"; // Tandai sebagai editan 'ai'
              }
            }
          }
        );
        setResults(newResults);
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        sender: "ai",
        text: `Maaf, terjadi kesalahan: ${err.message}`,
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    }
  };

  const tableFields: (keyof Omit<RopaData, "saran_ai">)[] = [
    "no_aktivitas",
    "nama_aktivitas",
    "unit_kerja",
    "departemen",
    "penanggung_jawab",
    "kedudukan_pemilik_proses",
    "tujuan_pemrosesan",
    "kebijakan_rujukan",
    "bentuk_data_pribadi",
    "subjek_data_pribadi",
    "jenis_data_pribadi",
    "data_pribadi_spesifik",
    "sumber_data",
    "penyimpanan_data",
    "metode_pemrosesan",
    "dasar_pemrosesan",
    "masa_retensi",
    "langkah_teknis_pengamanan",
    "langkah_organisasi_pengamanan",
    "kategori_penerima",
    "profil_penerima",
    "asesmen_risiko",
    "proses_sebelumnya",
    "proses_setelahnya",
    "keterangan_tambahan",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-7xl bg-white rounded-xl shadow-lg p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">RoPA AI Analyzer</h1>
          <p className="text-gray-500 mt-2">
            Unggah satu atau lebih dokumen untuk dianalisis secara terpisah.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center space-y-4"
        >
          <div
            className={`w-full max-w-2xl border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-500 hover:bg-gray-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, application/pdf"
              multiple
            />
            <p className="text-gray-600">
              {files.length > 0
                ? `${files.length} file terpilih`
                : "Klik atau seret file ke sini"}
            </p>
          </div>
          <button
            type="submit"
            disabled={isLoading || files.length === 0}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isLoading
              ? `Menganalisis ${files.length} file...`
              : "Proses Dokumen"}
          </button>
        </form>

        {error && (
          <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-700">
                Hasil Analisis
              </h2>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-6 py-2 font-semibold rounded-lg text-white transition-colors ${
                  isEditMode
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isEditMode ? "Simpan Perubahan" : "Ubah Data"}
              </button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full bg-white text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      File Asal
                    </th>
                    {tableFields.map((field) => (
                      <th
                        key={field}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        {field
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, resultIndex) => (
                    <tr key={resultIndex}>
                      <td className="px-4 py-2 ...">{result.fileName}</td>
                      {tableFields.map((fieldName) => {
                        const cell = result[fieldName];
                        if (!cell)
                          return (
                            <td key={fieldName} className="p-4 bg-red-100">
                              Error
                            </td>
                          );

                        // LANGKAH 3: Penanda visual baru
                        const bgColor =
                          cell.source === "manual"
                            ? "bg-green-50"
                            : cell.source === "ai"
                            ? "bg-blue-50"
                            : "bg-transparent";
                        const ringColor =
                          cell.source === "manual"
                            ? "focus:ring-green-500"
                            : cell.source === "ai"
                            ? "focus:ring-blue-500"
                            : "focus:ring-gray-500";

                        return (
                          <td key={fieldName} className="p-0">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={cell.value || ""}
                                onChange={(e) =>
                                  handleManualEdit(
                                    resultIndex,
                                    fieldName,
                                    e.target.value
                                  )
                                }
                                className={`w-full h-full p-4 border-none outline-none focus:ring-2 ${ringColor} transition-colors text-gray-700 ${bgColor}`}
                              />
                            ) : (
                              <div
                                className={`px-4 py-4 w-full h-full ${bgColor}`}
                              >
                                {cell.value || (
                                  <span className="text-red-500 italic">
                                    N/A
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-4">
              {results.map((result, index) =>
                result.saran_ai ? (
                  <div
                    key={index}
                    className="p-4 bg-yellow-50 border-l-4 border-yellow-400"
                  >
                    <h4 className="font-bold text-yellow-800">
                      Saran dari AI untuk{" "}
                      <span className="font-mono">{result.fileName}</span>
                    </h4>
                    <p className="text-sm text-yellow-700">{result.saran_ai}</p>
                  </div>
                ) : null
              )}
              <div className="text-center">
                <button
                  onClick={handleDownloadExcel}
                  className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition"
                >
                  Download Semua Hasil ke Excel
                </button>
              </div>
            </div>
          </div>
        )}
        {results.length > 0 && (
          <div className="pt-6 border-t">
            <h3 className="text-xl font-semibold text-center text-gray-700 mb-4">
              Brainstorming
            </h3>
            <div className="w-full max-w-2xl mx-auto bg-gray-50 p-4 rounded-lg border h-64 overflow-y-auto flex flex-col space-y-2 mb-4">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg max-w-xs ${
                    msg.sender === "user"
                      ? "bg-blue-500 self-end"
                      : "bg-gray-600 self-start"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <form
              onSubmit={handleChatSubmit}
              className="flex gap-2 max-w-2xl mx-auto"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanyakan sesuatu tentang data di atas..."
                className="flex-grow p-2 border text-black rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                Kirim
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
