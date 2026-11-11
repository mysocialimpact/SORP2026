import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument,StandardFonts } from "pdf-lib";
import { extractPages } from "../src/lib/impact-review/service";
test("PDF extraction retains physical page references and does not execute document instructions",async()=>{
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
  for(let i=1;i<=2;i++){const page=pdf.addPage();page.drawText(("This is evidence on page "+i+". We measure outcomes using participant surveys. ").repeat(5),{x:20,y:700,size:10,font,maxWidth:500});}
  const pages=await extractPages(Buffer.from(await pdf.save()));
  assert.equal(pages.length,2);assert.match(pages[1].text,/page 2/);assert.equal(pages[1].page,2);
});
test("invalid and image-only PDFs fail without producing a review",async()=>{
  await assert.rejects(()=>extractPages(Buffer.from("not a PDF")));
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());await assert.rejects(()=>extractPages(bytes),/readable text/);
});
