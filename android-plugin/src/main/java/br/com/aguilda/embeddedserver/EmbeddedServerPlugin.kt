package br.com.aguilda.embeddedserver

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.net.NetworkInterface
import java.util.Collections

/**
 * Ponte JS <-> Kotlin. No lado JavaScript (src/native/embeddedServer.js)
 * isso aparece como Capacitor.Plugins.EmbeddedServer.
 *
 * Uso típico no App Recepção:
 *   const { ip, porta } = await EmbeddedServer.iniciar();
 *   // mostra "http://<ip>:<porta>" para o operador digitar no outro aparelho
 *
 * No App Apresentação o plugin NÃO é usado — ele só consome a API via
 * fetch/WebSocket normal, como já implementado em src/core/apiClient.js.
 */
@CapacitorPlugin(name = "EmbeddedServer")
class EmbeddedServerPlugin : Plugin() {

    private var servidor: RecepcaoHttpServer? = null

    @PluginMethod
    fun iniciar(call: PluginCall) {
        val porta = call.getInt("porta") ?: 8080
        try {
            if (servidor == null) {
                servidor = RecepcaoHttpServer(porta, File(context.noBackupFilesDir, "sessao-recepcao.json")).also { it.start() }
            }
            val candidatos = listarCandidatos()
            val uteis = candidatos.filter { it.pontos >= 0 }.ifEmpty { candidatos }
            if (uteis.isEmpty()) {
                call.reject("Nao foi possivel determinar o IP local. Verifique se o hotspot/Wi-Fi esta ativo.")
                return
            }
            val melhor = uteis.first()
            val redes = JSArray()
            for (c in uteis) {
                val item = JSObject()
                item.put("interface", c.interfaceNome)
                item.put("ip", c.ip)
                item.put("url", "http://" + c.ip + ":" + porta)
                redes.put(item)
            }
            val resultado = JSObject()
            resultado.put("ip", melhor.ip)
            resultado.put("porta", porta)
            resultado.put("url", "http://" + melhor.ip + ":" + porta)
            resultado.put("redes", redes)
            call.resolve(resultado)
        } catch (e: Exception) {
            call.reject("Falha ao iniciar servidor local: " + e.message, e)
        }
    }

    @PluginMethod
    fun parar(call: PluginCall) {
        servidor?.stop()
        servidor = null
        call.resolve()
    }

    @PluginMethod
    fun status(call: PluginCall) {
        val resultado = JSObject()
        resultado.put("rodando", servidor != null)
        resultado.put("ip", obterIpLocal())
        call.resolve(resultado)
    }

    private data class Candidato(val interfaceNome: String, val ip: String, val pontos: Int)

    // Lista os IPv4 do aparelho, melhor candidato primeiro. Interfaces de dados
    // moveis (rmnet, ccmni...) recebem pontuacao negativa: o IP delas NAO e
    // alcancavel pelo outro celular. Hotspot (ap0/swlan0) e Wi-Fi (wlan0) ganham.
    private fun listarCandidatos(): List<Candidato> {
        val lista = mutableListOf<Candidato>()
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                if (!intf.isUp || intf.isLoopback) continue
                val nome = intf.name.lowercase()
                val ehCelular = nome.startsWith("rmnet") || nome.startsWith("ccmni") ||
                    nome.startsWith("tun") || nome.startsWith("dummy") ||
                    nome.startsWith("v4-") || nome.startsWith("clat") || nome.startsWith("p2p")
                for (endereco in Collections.list(intf.inetAddresses)) {
                    val ip = endereco.hostAddress ?: continue
                    if (endereco.isLoopbackAddress || ip.contains(":") || ip.startsWith("169.254.")) continue
                    var pontos = 0
                    if (ehCelular) pontos -= 100
                    if (nome.startsWith("ap") || nome.startsWith("swlan") || nome.startsWith("softap")) pontos += 20
                    if (nome.startsWith("wlan")) pontos += 10
                    if (nome.startsWith("eth") || nome.startsWith("rndis") || nome.startsWith("usb")) pontos += 5
                    if (ip.startsWith("192.168.")) {
                        pontos += 3
                    } else if (ip.startsWith("172.")) {
                        pontos += 2
                    } else if (ip.startsWith("10.")) {
                        pontos += 1
                    }
                    lista.add(Candidato(nome, ip, pontos))
                }
            }
        } catch (e: Exception) {
            // sem permissao/interface indisponivel: devolve o que conseguiu
        }
        return lista.sortedByDescending { it.pontos }
    }

    private fun obterIpLocal(): String? {
        val candidatos = listarCandidatos()
        val uteis = candidatos.filter { it.pontos >= 0 }.ifEmpty { candidatos }
        return uteis.firstOrNull()?.ip
    }
}
