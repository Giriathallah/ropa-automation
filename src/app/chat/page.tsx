"use client";

import { useState, useRef, FormEvent, ChangeEvent, DragEvent } from "react";
import * as XLSX from "xlsx";

// Interface RopaData updated to match API output
interface RopaData {
  no_aktivitas: string | null;
  nama_aktivitas: string | null;
  unit_kerja: string | null;
  departemen: string | null;
  penanggung_jawab: string | null;
  kedudukan_pemilik_proses: string | null;
  deskripsi_dan_tujuan_pemrosesan?: string | null;
  deskripsi_tujuan_pemrosesan?: string | null;
  kebijakan_rujukan?: string | null;
  kebijakan_sop_ik_dokumen_rujukan?: string | null;
  bentuk_data_pribadi: string | null;
  subjek_data_pribadi: string | null;
  jenis_data_pribadi: string | null;
  data_pribadi_spesifik: "Ya" | "Tidak" | null;
  sumber_pemerolehan_data_pribadi?: string | null;
  sumber_data?: string | null;
  akurasi_dan_kelengkapan_data_pribadi?: string | null;
  akurasi_kelengkapan_data_pribadi?: string | null;
  penyimpanan_data_pribadi?: string | null;
  penyimpanan_data?: string | null;
  metode_pemrosesan_data_pribadi?: string | null;
  metode_pemrosesan?: string | null;
  pengambilan_keputusan_terotomasi?: string | null;
  dasar_pemrosesan: string | null;
  masa_retensi_data_pribadi?: string | null;
  masa_retensi?: string | null;
  kewajiban_hukum_untuk_menyimpan_data_pribadi?: string | null;
  kewajiban_hukum_retensi?: string | null;
  langkah_teknis_pengamanan_data_pribadi?: string | null;
  langkah_teknis_pengamanan?: string | null;
  langkah_organisasi_pengamanan_data_pribadi?: string | null;
  langkah_organisasi_pengamanan?: string | null;
  kategori_dan_jenis_penerima_data_pribadi?: string | null;
  kategori_penerima?: string | null;
  profil_penerima_data_pribadi?: string | null;
  profil_penerima?: string | null;
  tujuan_pengiriman_akses_data_pribadi?: string | null;
  mekanisme_transfer_akses?: string | null;
  hak_subjek_data_pribadi_yang_berlaku?: string | null;
  hak_subjek_data_pribadi?: string | null;
  asesmen_risiko: string | null;
  proses_kegiatan_sebelumnya?: string | null;
  proses_sebelumnya?: string | null;
  proses_kegiatan_setelahnya?: string | null;
  proses_setelahnya?: string | null;
  keterangan_catatan_tambahan?: string | null;
  keterangan_tambahan?: string | null;
  saran_ai: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

interface RopaResult extends RopaData {
  fileName: string;
}

export default function RopaAnalyzerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<RopaResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFiles = (selectedFiles: FileList | null) => {
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

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

  // Helper function to get field value with fallback options
  const getFieldValue = (
    result: RopaData,
    ...fieldNames: (keyof RopaData)[]
  ) => {
    for (const fieldName of fieldNames) {
      const value = result[fieldName];
      if (value !== null && value !== undefined) {
        return value;
      }
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Silakan pilih satu atau lebih file terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("datanya", file);
      });

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Terjadi kesalahan tidak diketahui."
        );
      }

      const data = await response.json();

      // Map the results with file names
      const mappedResults: RopaResult[] = data.map(
        (result: RopaData, index: number) => ({
          ...result,
          fileName: files[index]?.name || `File ${index + 1}`,
        })
      );

      setResults(mappedResults);
    } catch (err: any) {
      setError(`Gagal memproses file: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (results.length === 0) return;

    const dataToExport = results.map((result) => ({
      "File Asal": result.fileName,
      "No Aktivitas": result.no_aktivitas || "N/A",
      "Nama Aktivitas": result.nama_aktivitas || "N/A",
      "Unit Kerja / Divisi": result.unit_kerja || "N/A",
      "Departemen / Sub-Departemen": result.departemen || "N/A",
      "Penanggung Jawab Proses": result.penanggung_jawab || "N/A",
      "Kedudukan Pemilik Proses": result.kedudukan_pemilik_proses || "N/A",
      "Deskripsi dan Tujuan Pemrosesan":
        getFieldValue(
          result,
          "deskripsi_dan_tujuan_pemrosesan",
          "deskripsi_tujuan_pemrosesan"
        ) || "N/A",
      "Kebijakan/SOP/IK/Dokumen Rujukan":
        getFieldValue(
          result,
          "kebijakan_sop_ik_dokumen_rujukan",
          "kebijakan_rujukan"
        ) || "N/A",
      "Bentuk Data Pribadi": result.bentuk_data_pribadi || "N/A",
      "Subjek Data Pribadi": result.subjek_data_pribadi || "N/A",
      "Jenis Data Pribadi": result.jenis_data_pribadi || "N/A",
      "Data Pribadi Spesifik": result.data_pribadi_spesifik || "N/A",
      "Sumber Pemerolehan Data Pribadi":
        getFieldValue(
          result,
          "sumber_pemerolehan_data_pribadi",
          "sumber_data"
        ) || "N/A",
      "Akurasi dan Kelengkapan Data Pribadi":
        getFieldValue(
          result,
          "akurasi_dan_kelengkapan_data_pribadi",
          "akurasi_kelengkapan_data_pribadi"
        ) || "N/A",
      "Penyimpanan Data Pribadi":
        getFieldValue(result, "penyimpanan_data_pribadi", "penyimpanan_data") ||
        "N/A",
      "Metode Pemrosesan Data Pribadi":
        getFieldValue(
          result,
          "metode_pemrosesan_data_pribadi",
          "metode_pemrosesan"
        ) || "N/A",
      "Pengambilan Keputusan Terotomasi":
        result.pengambilan_keputusan_terotomati || "N/A",
      "Dasar Pemrosesan": result.dasar_pemrosesan || "N/A",
      "Masa Retensi Data Pribadi":
        getFieldValue(result, "masa_retensi_data_pribadi", "masa_retensi") ||
        "N/A",
      "Kewajiban Hukum untuk menyimpan Data Pribadi":
        getFieldValue(
          result,
          "kewajiban_hukum_untuk_menyimpan_data_pribadi",
          "kewajiban_hukum_retensi"
        ) || "N/A",
      "Langkah Teknis Pengamanan Data Pribadi":
        getFieldValue(
          result,
          "langkah_teknis_pengamanan_data_pribadi",
          "langkah_teknis_pengamanan"
        ) || "N/A",
      "Langkah Organisasi Pengamanan Data Pribadi":
        getFieldValue(
          result,
          "langkah_organisasi_pengamanan_data_pribadi",
          "langkah_organisasi_pengamanan"
        ) || "N/A",
      "Kategori dan Jenis Penerima Data Pribadi":
        getFieldValue(
          result,
          "kategori_dan_jenis_penerima_data_pribadi",
          "kategori_penerima"
        ) || "N/A",
      "Profil Penerima Data Pribadi":
        getFieldValue(
          result,
          "profil_penerima_data_pribadi",
          "profil_penerima"
        ) || "N/A",
      "Tujuan Pengiriman / Akses Data Pribadi":
        result.tujuan_pengiriman_akses_data_pribadi || "N/A",
      "Mekanisme Transfer / Akses": result.mekanisme_transfer_akses || "N/A",
      "Hak Subjek Data Pribadi yang Berlaku":
        getFieldValue(
          result,
          "hak_subjek_data_pribadi_yang_berlaku",
          "hak_subjek_data_pribadi"
        ) || "N/A",
      "Asesmen Risiko": result.asesmen_risiko || "N/A",
      "Proses / Kegiatan Sebelumnya":
        getFieldValue(
          result,
          "proses_kegiatan_sebelumnya",
          "proses_sebelumnya"
        ) || "N/A",
      "Proses / Kegiatan Setelahnya":
        getFieldValue(
          result,
          "proses_kegiatan_setelahnya",
          "proses_setelahnya"
        ) || "N/A",
      "Keterangan / Catatan Tambahan":
        getFieldValue(
          result,
          "keterangan_catatan_tambahan",
          "keterangan_tambahan"
        ) || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RoPA_Data");
    worksheet["!cols"] = Array(26).fill({ wch: 35 });
    XLSX.writeFile(workbook, "Hasil_Analisis_Multi-File.xlsx");
  };

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
        body: JSON.stringify({
          question: chatInput,
          context: results,
        }),
      });

      if (!response.ok) throw new Error("Gagal mendapatkan respons dari AI.");

      const result = await response.json();
      const aiMessage: ChatMessage = { sender: "ai", text: result.answer };
      setChatHistory((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        sender: "ai",
        text: `Maaf, terjadi kesalahan: ${err.message}`,
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    }
  };

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
            <h2 className="text-2xl font-semibold text-center text-gray-700">
              Hasil Analisis
            </h2>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full bg-white text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {[
                      "File Asal",
                      "No Aktivitas",
                      "Nama Aktivitas",
                      "Unit Kerja / Divisi",
                      "Departemen / Sub-Departemen",
                      "Penanggung Jawab Proses",
                      "Kedudukan Pemilik Proses",
                      "Deskripsi dan Tujuan Pemrosesan",
                      "Kebijakan/SOP/IK/Dokumen Rujukan",
                      "Bentuk Data Pribadi",
                      "Subjek Data Pribadi",
                      "Jenis Data Pribadi",
                      "Data Pribadi Spesifik",
                      "Sumber Pemerolehan Data Pribadi",
                      "Akurasi dan Kelengkapan Data Pribadi",
                      "Penyimpanan Data Pribadi",
                      "Metode Pemrosesan Data Pribadi",
                      "Pengambilan Keputusan Terotomati",
                      "Dasar Pemrosesan",
                      "Masa Retensi Data Pribadi",
                      "Kewajiban Hukum untuk menyimpan Data Pribadi",
                      "Langkah Teknis Pengamanan",
                      "Langkah Organisasi Pengamanan",
                      "Kategori dan Jenis Penerima",
                      "Profil Penerima",
                      "Tujuan Pengiriman / Akses Data Pribadi",
                      "Mekanisme Transfer / Akses",
                      "Hak Subjek Data Pribadi yang Berlaku",
                      "Asesmen Risiko",
                      "Proses / Kegiatan Sebelumnya",
                      "Proses / Kegiatan Setelahnya",
                      "Keterangan / Catatan Tambahan",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-800 font-bold">
                        {result.fileName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.no_aktivitas || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.nama_aktivitas || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.unit_kerja || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.departemen || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.penanggung_jawab || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.kedudukan_pemilik_proses || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {getFieldValue(
                          result,
                          "deskripsi_dan_tujuan_pemrosesan",
                          "deskripsi_tujuan_pemrosesan"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "kebijakan_sop_ik_dokumen_rujukan",
                          "kebijakan_rujukan"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.bentuk_data_pribadi || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.subjek_data_pribadi || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {result.jenis_data_pribadi || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.data_pribadi_spesifik || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "sumber_pemerolehan_data_pribadi",
                          "sumber_data"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "akurasi_dan_kelengkapan_data_pribadi",
                          "akurasi_kelengkapan_data_pribadi"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "penyimpanan_data_pribadi",
                          "penyimpanan_data"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "metode_pemrosesan_data_pribadi",
                          "metode_pemrosesan"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.pengambilan_keputusan_terotomati || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.dasar_pemrosesan || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "masa_retensi_data_pribadi",
                          "masa_retensi"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "kewajiban_hukum_untuk_menyimpan_data_pribadi",
                          "kewajiban_hukum_retensi"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {getFieldValue(
                          result,
                          "langkah_teknis_pengamanan_data_pribadi",
                          "langkah_teknis_pengamanan"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {getFieldValue(
                          result,
                          "langkah_organisasi_pengamanan_data_pribadi",
                          "langkah_organisasi_pengamanan"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "kategori_dan_jenis_penerima_data_pribadi",
                          "kategori_penerima"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "profil_penerima_data_pribadi",
                          "profil_penerima"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {result.tujuan_pengiriman_akses_data_pribadi || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {result.mekanisme_transfer_akses || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {getFieldValue(
                          result,
                          "hak_subjek_data_pribadi_yang_berlaku",
                          "hak_subjek_data_pribadi"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {result.asesmen_risiko || (
                          <span className="text-red-500 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "proses_kegiatan_sebelumnya",
                          "proses_sebelumnya"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                        {getFieldValue(
                          result,
                          "proses_kegiatan_setelahnya",
                          "proses_setelahnya"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-gray-700 min-w-[300px]">
                        {getFieldValue(
                          result,
                          "keterangan_catatan_tambahan",
                          "keterangan_tambahan"
                        ) || <span className="text-red-500 italic">N/A</span>}
                      </td>
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
