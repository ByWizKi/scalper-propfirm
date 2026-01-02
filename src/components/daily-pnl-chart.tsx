"use client"

import { useEffect, useRef, useMemo } from "react"
import * as d3 from "d3"

interface DailyBalanceData {
  time: string
  balance: number
  timestamp: number // Timestamp pour le calcul de l'axe X
}

interface DailyPnlChartProps {
  data: DailyBalanceData[]
  currentDate: string
  totalPnl: number
}

const COLORS = {
  green: "#22c55e",
  red: "#ef4444",
}

export function DailyPnlChart({
  data,
  currentDate: _currentDate,
  totalPnl: _totalPnl,
}: DailyPnlChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const chartData = useMemo(() => {
    if (data.length === 0)
      return { segments: [], minTime: 0, maxTime: 0, minBalance: 0, maxBalance: 0 }

    // Utiliser directement les timestamps des données
    const dataWithTimestamps = data

    // Calculer les limites de l'axe X (uniquement entre le premier et dernier trade)
    const timestamps = dataWithTimestamps.map((d) => d.timestamp)
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)

    // Calculer les limites de l'axe Y
    const balances = dataWithTimestamps.map((d) => d.balance)
    const minBalance = Math.min(...balances, 0) // Inclure 0 pour la référence
    const maxBalance = Math.max(...balances, 0) // Inclure 0 pour la référence

    // Créer des segments positifs et négatifs pour le changement de couleur
    const segments: Array<{
      data: Array<{ timestamp: number; balance: number; time: string }>
      isPositive: boolean
    }> = []

    let currentSegment: Array<{ timestamp: number; balance: number; time: string }> = []
    let currentIsPositive = dataWithTimestamps[0].balance >= 0

    for (let i = 0; i < dataWithTimestamps.length; i++) {
      const point = dataWithTimestamps[i]
      const isPositive = point.balance >= 0

      // Si on change de signe, créer un nouveau segment avec un point à zéro
      if (isPositive !== currentIsPositive && currentSegment.length > 0) {
        // Ajouter le dernier point du segment précédent (utilisé implicitement via currentSegment)
        // Créer un point à zéro pour la transition
        const zeroPoint = {
          timestamp: point.timestamp,
          balance: 0,
          time: point.time,
        }
        currentSegment.push(zeroPoint)
        segments.push({ data: currentSegment, isPositive: currentIsPositive })

        // Commencer un nouveau segment
        currentSegment = [zeroPoint, point]
        currentIsPositive = isPositive
      } else {
        currentSegment.push(point)
      }
    }

    // Ajouter le dernier segment
    if (currentSegment.length > 0) {
      segments.push({ data: currentSegment, isPositive: currentIsPositive })
    }

    return {
      segments,
      minTime,
      maxTime,
      minBalance,
      maxBalance,
    }
  }, [data])

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)

    const renderChart = () => {
      // Nettoyer le SVG précédent
      svg.selectAll("*").remove()

      // Obtenir la largeur du conteneur parent
      const containerElement = svgRef.current?.parentElement
      const containerWidth = containerElement?.clientWidth || 800

      // Marges adaptatives selon la taille de l'écran
      const isMobile = containerWidth < 640
      const margin = isMobile
        ? { top: 15, right: 10, bottom: 35, left: 50 }
        : { top: 20, right: 20, bottom: 40, left: 70 }

      // Largeur minimale adaptative
      const minWidth = isMobile ? 280 : 400
      const width = Math.max(containerWidth - margin.left - margin.right, minWidth)
      const height = isMobile ? 280 : 350
      const totalHeight = height + margin.top + margin.bottom

      // Définir la largeur du SVG
      svg.attr("width", containerWidth).attr("height", totalHeight)

      // Créer le groupe principal
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

      // Échelles
      const xScale = d3.scaleTime().domain([chartData.minTime, chartData.maxTime]).range([0, width])

      const yScale = d3
        .scaleLinear()
        .domain([chartData.minBalance, chartData.maxBalance])
        .nice()
        .range([height, 0])

      // Ligne STEP avec d3.curveStepAfter
      const line = d3
        .line<{ timestamp: number; balance: number }>()
        .x((d) => xScale(d.timestamp))
        .y((d) => yScale(d.balance))
        .curve(d3.curveStepAfter)

      // Zone remplie
      const area = d3
        .area<{ timestamp: number; balance: number }>()
        .x((_d) => xScale(_d.timestamp))
        .y0((_d) => yScale(0))
        .y1((_d) => yScale(_d.balance))
        .curve(d3.curveStepAfter)

      // Créer les définitons (dégradés et filtres)
      const defs = svg.append("defs")

      // Ajouter le filtre glow pour le marqueur actif
      if (defs.select("#glow").empty()) {
        const filter = defs.append("filter").attr("id", "glow")
        filter.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "coloredBlur")
        const feMerge = filter.append("feMerge")
        feMerge.append("feMergeNode").attr("in", "coloredBlur")
        feMerge.append("feMergeNode").attr("in", "SourceGraphic")
      }

      // Grille horizontale
      const yAxisGrid = d3
        .axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => "")

      g.append("g")
        .attr("class", "grid")
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.1)
        .attr("stroke-dasharray", "3,3")
        .call(yAxisGrid)

      // Ligne de référence à zéro
      g.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4")

      // Zones remplies et lignes par segment
      chartData.segments.forEach((segment) => {
        const color = segment.isPositive ? COLORS.green : COLORS.red
        const gradientId = segment.isPositive ? "gradientGreen" : "gradientRed"

        // Créer le dégradé pour la zone
        const gradient = defs
          .append("linearGradient")
          .attr("id", gradientId)
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "0%")
          .attr("y2", "100%")

        gradient
          .append("stop")
          .attr("offset", "0%")
          .attr("stop-color", color)
          .attr("stop-opacity", 0.3)

        gradient
          .append("stop")
          .attr("offset", "50%")
          .attr("stop-color", color)
          .attr("stop-opacity", 0.15)

        gradient
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", color)
          .attr("stop-opacity", 0)

        // Zone remplie
        g.append("path")
          .datum(segment.data)
          .attr("fill", `url(#${gradientId})`)
          .attr("d", area)
          .style("pointer-events", "none") // Désactiver les événements sur les zones remplies

        // Ligne STEP
        g.append("path")
          .datum(segment.data)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 3)
          .attr("d", line)
          .style("pointer-events", "none") // Désactiver les événements sur les lignes
      })

      // Axe X
      const xAxis = d3
        .axisBottom(xScale)
        .tickFormat((d) => {
          const date = d as Date
          return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        })
        .ticks(isMobile ? (data.length > 6 ? 6 : data.length) : data.length > 10 ? 10 : data.length)

      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.3)
        .call(xAxis)
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("opacity", 0.7)
        .attr("font-size", isMobile ? 9 : 11)

      g.append("text")
        .attr("x", width / 2)
        .attr("y", height + (isMobile ? 28 : 35))
        .attr("fill", "currentColor")
        .attr("opacity", 0.6)
        .attr("font-size", isMobile ? 9 : 11)
        .attr("text-anchor", "middle")
        .text("Heure")

      // Axe Y
      const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => {
          const value = d as number
          // Sur mobile, simplifier le format si les valeurs sont grandes
          if (isMobile && Math.abs(value) >= 1000) {
            return `${value >= 0 ? "+" : ""}$${(value / 1000).toFixed(1)}k`
          }
          return `${value >= 0 ? "+" : ""}$${value.toFixed(0)}`
        })
        .ticks(isMobile ? 5 : undefined)

      g.append("g")
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.3)
        .call(yAxis)
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("opacity", 0.7)
        .attr("font-size", isMobile ? 9 : 11)

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", isMobile ? -40 : -50)
        .attr("x", -height / 2)
        .attr("fill", "currentColor")
        .attr("opacity", 0.6)
        .attr("font-size", isMobile ? 9 : 11)
        .attr("text-anchor", "middle")
        .text("Profit ($)")

      // Points interactifs avec marqueur au survol
      g.selectAll(".trade-point")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "trade-point")
        .attr("cx", (d) => xScale(d.timestamp))
        .attr("cy", (d) => yScale(d.balance))
        .attr("r", 0)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .style("pointer-events", "all")
        .on("mouseover", function (event: MouseEvent, d: DailyBalanceData) {
          const isNegative = d.balance < 0
          const color = isNegative ? COLORS.red : COLORS.green

          // Afficher le marqueur
          d3.select(this)
            .attr("r", 10)
            .attr("fill", color)
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .style("filter", "url(#glow)")

          // Ligne verticale
          g.append("line")
            .attr("class", "vertical-line")
            .attr("x1", xScale(d.timestamp))
            .attr("x2", xScale(d.timestamp))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "currentColor")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.4)
        })
        .on("mouseout", function () {
          d3.select(this)
            .attr("r", 0)
            .attr("fill", "transparent")
            .attr("stroke", "transparent")
            .attr("stroke-width", 0)
          g.selectAll(".vertical-line").remove()
        })
    }

    // Variables pour la gestion des performances
    let resizeTimeout: NodeJS.Timeout | null = null

    // Rendre le graphique initial
    renderChart()

    // Gérer le redimensionnement avec debounce pour améliorer les performances
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      resizeTimeout = setTimeout(() => {
        renderChart()
        resizeTimeout = null
      }, 150) // Debounce de 150ms
    })

    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement)
    }

    return () => {
      resizeObserver.disconnect()
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
    }
  }, [data, chartData])

  if (data.length === 0) return null

  return (
    <div className="relative w-full overflow-x-auto -mx-1 sm:mx-0">
      <svg
        ref={svgRef}
        width="100%"
        height="350"
        className="overflow-visible"
        style={{ minWidth: "320px", minHeight: "280px" }}
      />
    </div>
  )
}
