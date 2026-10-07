package br.com.aguilda.recepcaovisitantes;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import br.com.aguilda.embeddedserver.EmbeddedServerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EmbeddedServerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}