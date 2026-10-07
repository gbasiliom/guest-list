package br.com.aguilda.embeddedserver.model

object Expiracao {

    const val DURACAO_SESSAO_MS: Long = 10L * 60 * 60 * 1000

    fun calcularExpiracao(criadoEm: Long): Long = criadoEm + DURACAO_SESSAO_MS

    fun sessaoExpirada(criadoEm: Long, agora: Long = System.currentTimeMillis()): Boolean =
        agora >= calcularExpiracao(criadoEm)

    fun gerarResumoAgregado(visitantes: List<Visitante>, grupos: List<ItemExibicao>): Map<String, Any> {
        val totalCaravanas = grupos.count { it is ItemExibicao.Caravana }
        val totalComCargo = visitantes.count { it.cargo != "sem_cargo" }

        return mapOf(
            "totalVisitantes" to visitantes.size,
            "totalCaravanas" to totalCaravanas,
            "totalComCargo" to totalComCargo,
            "geradoEm" to System.currentTimeMillis()
        )
    }
}
