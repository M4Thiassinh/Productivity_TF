SELECT 
    -- TIEMPO Y TRANSACCIÓN
    c.bof_fecha AS Fecha,
    HOUR(c.bof_hora) AS Hora,
    DAYNAME(c.bof_fecha) AS Dia_Semana,
    CONCAT(c.caj_id, '-', c.bof_numero) AS ID_Ticket,
    
    -- PRODUCTO
    p.pro_nombre_producto AS Producto,
    dept.dep_nombre AS Departamento,
    l.lin_nombre AS Linea,
    
    -- MÉTRICAS NETAS
    d.bfm_cantidad AS Unidades,
    d.bfm_total AS Venta_Total_Bruta,
    -- 1. Venta Neta (Venta Bruta / 1.19)
    ROUND(d.bfm_total / 1.19, 2) AS Venta_Total_Neta,
    
    -- 2. Costo Unitario Neto
    ROUND(IFNULL(p.pro_precio_compra_bruto, 0) / 1.19, 2) AS Costo_Unitario_Neto,
    
    -- 3. Margen Neto Real (Venta Neta - Costo Neto Total)
    ROUND((d.bfm_total / 1.19) - (IFNULL(p.pro_precio_compra_bruto, 0) / 1.19 * d.bfm_cantidad), 2) AS Margen_Neto

FROM 
    ven_boleta_fiscal c
JOIN 
    ven_boleta_fiscal_mov d 
    ON c.bof_numero = d.bof_numero 
    AND c.caj_id = d.caj_id
JOIN 
    mae_productos p 
    ON d.pro_codigo_plu = p.pro_codigo_plu
LEFT JOIN
    mae_departamento dept 
    ON p.dep_id = dept.dep_id
LEFT JOIN 
    mae_linea l 
    ON p.lin_id = l.lin_id 
    AND p.dep_id = l.dep_id  -- Cruce doble para asegurar que la línea pertenezca a ese departamento
WHERE 
    c.caj_id NOT IN (10, 21)
    AND dept.dep_nombre = 'TEJA FOOD' 
    AND c.bof_fecha BETWEEN '2026-02-01' AND '2026-02-16'
ORDER BY 
    c.bof_fecha, c.bof_hora;