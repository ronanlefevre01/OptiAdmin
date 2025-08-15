import { useState } from "react";

export default function LicenceCreateForm() {
  const [form, setForm] = useState({
    name: "",
    siret: "",
    sender: "",
    plan: "basic",
    credits: 0,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onlyAZ09(s: string) {
    return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  const validSender = form.sender.length >= 3 && form.sender.length <= 11;
  const canSubmit = !!form.name && validSender && !loading;

  async function submit() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/licences/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          siret: form.siret || undefined,
          sender: onlyAZ09(form.sender),           // 3–11 A-Z/0-9
          plan: form.plan,                         // basic | pro | unlimited
          credits: Number(form.credits) || 0,
          contact: {
            name: form.contactName || undefined,
            email: form.contactEmail || undefined,
            phone: form.contactPhone || undefined,
          },
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setMsg(`✅ Licence créée: ${j.licence?.id} — expéditeur ${j.licence?.sender}`);
      // reset léger
      setForm({ ...form, name: "", siret: "", sender: "", credits: 0 });
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, padding: 16 }}>
      <h2>Créer une licence</h2>

      <label>Enseigne*<br/>
        <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
      </label><br/>

      <label>SIRET<br/>
        <input value={form.siret} onChange={e=>setForm(f=>({...f, siret:e.target.value}))} />
      </label><br/>

      <label>Expéditeur SMS* (3–11 A-Z/0-9)<br/>
        <input
          value={form.sender}
          onChange={e=>setForm(f=>({...f, sender: e.target.value}))}
          onBlur={()=>setForm(f=>({...f, sender: onlyAZ09(f.sender)}))}
          placeholder="OPTICOM"
        />
      </label>
      {!validSender && form.sender && <div style={{color:"#b00"}}>Entre 3 et 11 caractères A-Z/0-9.</div>}
      <br/>

      <label>Plan<br/>
        <select value={form.plan} onChange={e=>setForm(f=>({...f, plan:e.target.value}))}>
          <option value="basic">basic</option>
          <option value="pro">pro</option>
          <option value="unlimited">unlimited</option>
        </select>
      </label><br/>

      <label>Crédits initiaux<br/>
        <input type="number" value={form.credits}
               onChange={e=>setForm(f=>({...f, credits: Number(e.target.value)}))}/>
      </label><br/>

      <fieldset style={{marginTop:12}}>
        <legend>Contact</legend>
        <label>Nom<br/>
          <input value={form.contactName} onChange={e=>setForm(f=>({...f, contactName:e.target.value}))}/>
        </label><br/>
        <label>Email<br/>
          <input value={form.contactEmail} onChange={e=>setForm(f=>({...f, contactEmail:e.target.value}))}/>
        </label><br/>
        <label>Téléphone<br/>
          <input value={form.contactPhone} onChange={e=>setForm(f=>({...f, contactPhone:e.target.value}))}/>
        </label>
      </fieldset>

      <button onClick={submit} disabled={!canSubmit} style={{marginTop:12}}>
        {loading ? "Création…" : "Créer la licence"}
      </button>

      {msg && <p style={{marginTop:8}}>{msg}</p>}
    </div>
  );
}
