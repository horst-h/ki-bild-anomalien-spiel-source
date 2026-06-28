import { motion } from "motion/react";
import image_csm_schwaebisch_hall_fuchs_webseite_transparent_ab262067f2 from "@/imports/csm_schwaebisch-hall_fuchs_webseite-transparent_ab262067f2.png";
import { ScanLines } from "../components/ScanLines";
import { CornerBrackets } from "../components/CornerBrackets";

export function StartScreen({ onStart, onAdmin }: { onStart: () => void; onAdmin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background relative flex flex-col items-center justify-center p-8 overflow-hidden"
    >
      <ScanLines />
      <CornerBrackets />

      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(254,230,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(254,230,0,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 text-center max-w-xl">
        <p
          className="font-code text-xs tracking-[0.4em] mb-4 opacity-60"
          style={{ color: "#FEE600" }}
        >
          SYSTEM AKTIV // KI-ANALYSE MODUL v2.4
        </p>

        <h1
          className="font-display text-[clamp(4rem,12vw,9rem)] font-black uppercase leading-none tracking-tight mb-1"
          style={{ color: "#FEE600" }}
        >
          KI IM
        </h1>
        <h1
          className="font-display text-[clamp(4rem,12vw,9rem)] font-black uppercase leading-none tracking-tight"
          style={{ color: "#E0E0D8" }}
        >
          VISIER
        </h1>

        <div className="flex items-center justify-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: "rgba(254,230,0,0.3)" }} />
          <span className="font-code text-xs tracking-widest opacity-40" style={{ color: "#FEE600" }}>
            ◆
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(254,230,0,0.3)" }} />
        </div>

        {/* Animated fox */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className="flex justify-center mb-6"
        >
          <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-2xl">
            <img src={image_csm_schwaebisch_hall_fuchs_webseite_transparent_ab262067f2} alt="Fuchs Maskottchen" className="w-44 h-44 object-contain" />
          </div>
        </motion.div>

        <p className="font-code text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto text-[15px]">
          Entdecke KI-Anomalien in synthetischen Bildern.
          <br />
          Bist du scharf genug, die Fehler zu finden?
        </p>

        <div className="flex flex-col gap-3 items-center">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="w-64 py-4 font-display font-black uppercase text-xl tracking-[0.15em] transition-all"
            style={{ background: "#FEE600", color: "#121414" }}
          >
            SPIEL STARTEN
          </motion.button>

          <button
            onClick={onAdmin}
            className="w-64 py-3 font-code text-xs tracking-[0.2em] text-muted-foreground transition-all"
            style={{ border: "1px solid rgba(254,230,0,0.2)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#FEE600";
              (e.currentTarget as HTMLButtonElement).style.color = "#FEE600";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(254,230,0,0.2)";
              (e.currentTarget as HTMLButtonElement).style.color = "#A8ABA7";
            }}
          >
            ADMIN ZUGANG
          </button>
        </div>

        <p className="mt-10 font-code text-xs opacity-25" style={{ color: "#FEE600" }}>
          KINETIC TRUTH // FESTIVAL EDITION 2025
        </p>
      </div>
    </motion.div>
  );
}
