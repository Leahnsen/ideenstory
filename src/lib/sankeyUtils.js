// src/lib/sankeyUtils.js
//  @ts-nocheck
import { sankey } from 'd3-sankey';

export function buildSankeyGraph(rawData, allData, width, height) {
  const stages = ["Idee", "Projektskizze", "Maßnahme", "Umsetzungsprojekt"];
  // 1) Nodes aufbauen
  let nodes = [];
  let nodesMap = {};
  // → Idee-Nodes aus allData
  allData.forEach(rec => {
    const key = `Idee:${rec.idee}`;
    if (!nodesMap[key]) {
      nodesMap[key] = nodes.length;
      nodes.push({ id: key, name: rec.idee, stage: "Idee", originalIdea: rec.idee });
    }
  });
  // → weitere Stages
  stages.slice(1).forEach(stage => {
    rawData.forEach(rec => {
      const val = rec[stage.toLowerCase()];
      if (!val) return;
      const parts = (stage !== "Projektskizze" && val.includes(",")) 
        ? val.split(",").map(s => s.trim()) 
        : [val];
      parts.forEach(p => {
        const key = `${stage}:${p}`;
        if (!nodesMap[key]) {
          nodesMap[key] = nodes.length;
          nodes.push({ id: key, name: p, stage, originalIdea: null });
        }
      });
    });
  });

  // 2) Roh-Links erzeugen
  let rawLinks = [];
  rawData.forEach(rec => {
    const flow = [
      { stage: "Idee", value: rec.idee },
      { stage: "Projektskizze", value: rec.projektskizze },
      { stage: "Maßnahme", value: rec.maßnahme },
      { stage: "Umsetzungsprojekt", value: rec.umsetzungsprojekt }
    ];
    for (let i = 0; i < flow.length - 1; i++) {
      const srcs = (i > 0 && flow[i].value.includes(",")) 
        ? flow[i].value.split(",").map(s => s.trim()) 
        : [flow[i].value];
      const tars = (i > 0 && flow[i+1].value.includes(",")) 
        ? flow[i+1].value.split(",").map(s => s.trim()) 
        : [flow[i+1].value];
      srcs.forEach(sv =>
        tars.forEach(tv => {
          const sKey = `${flow[i].stage}:${sv}`;
          const tKey = `${flow[i+1].stage}:${tv}`;
          if (nodesMap[sKey] !== undefined && nodesMap[tKey] !== undefined) {
            rawLinks.push({ source: nodesMap[sKey], target: nodesMap[tKey], value: 1 });
          }
        })
      );
    }
  });
  // 3) Links aggregieren
  const linksMap = {};
  rawLinks.forEach(l => {
    const k = `${l.source}->${l.target}`;
    if (linksMap[k]) linksMap[k].value += l.value;
    else linksMap[k] = { ...l };
  });
  const links = Object.values(linksMap);

  // 4) D3-Sankey-Layout
  const sankeyGen = sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([[1, 1], [width - 1, height - 1]]);
  const { nodes: layoutNodes, links: layoutLinks } = sankeyGen({
    nodes: nodes.map(d => ({ ...d })),
    links: links.map(d => ({ ...d }))
  });

  // 5) Start-Positionen für “Idee”-Nodes extrahieren
  const startPositions = {};
  layoutNodes
    .filter(n => n.stage === "Idee")
    .forEach(n => startPositions[n.name] = { x: n.x0, y: n.y0 });
  

  return {
    nodes: layoutNodes,
    links: layoutLinks,
    startPositions
  };
}
