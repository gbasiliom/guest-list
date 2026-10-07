package br.com.aguilda.embeddedserver.model

object Grupos {

    private const val LIMITE_CARAVANA = 3

    fun calcular(visitantes: List<Visitante>): List<ItemExibicao> {
        val grupos = LinkedHashMap<String, MutableList<Visitante>>()

        for (v in visitantes) {
            val chave = "${v.igreja.trim().lowercase()}|${v.local.trim().lowercase()}"
            grupos.getOrPut(chave) { mutableListOf() }.add(v)
        }

        val itens = mutableListOf<ItemExibicao>()

        for ((_, membros) in grupos) {
            if (membros.size > LIMITE_CARAVANA) {
                val representante = membros.minByOrNull { Cargos.precedencia(it.cargo) } ?: membros.first()
                val titulo = Cargos.tituloExibicao(representante.cargo)
                val prefixo = if (titulo.isNotEmpty()) "$titulo " else ""
                val etiqueta = "$prefixo${representante.nome} + caravana — ${representante.igreja}, ${representante.local} (${membros.size} pessoas)"
                itens.add(
                    ItemExibicao.Caravana(
                        etiqueta = etiqueta,
                        representante = representante,
                        membros = membros,
                        totalPessoas = membros.size
                    )
                )
            } else {
                for (v in membros) {
                    itens.add(ItemExibicao.Individual(v))
                }
            }
        }

        return itens.sortedWith(
            compareBy(
                { item ->
                    when (item) {
                        is ItemExibicao.Individual -> Cargos.precedencia(item.visitante.cargo)
                        is ItemExibicao.Caravana -> Cargos.precedencia(item.representante.cargo)
                    }
                },
                { item ->
                    when (item) {
                        is ItemExibicao.Individual -> item.visitante.criadoEm
                        is ItemExibicao.Caravana -> item.membros.minOf { it.criadoEm }
                    }
                }
            )
        )
    }
}
